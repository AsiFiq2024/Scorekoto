import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const shouldApply = process.argv.includes("--apply");
const verifyAll = process.argv.includes("--verify-all");
const concurrency = verifyAll ? 60 : 20;

if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

function photoUrl(playerId) {
  return `https://media.api-sports.io/football/players/${playerId}.png`;
}

async function verifyPhoto(player) {
  const currentUrl = String(player.photo_url || "").trim() || null;
  const canonicalUrl = photoUrl(player.player_id);
  const urls = [...new Set([currentUrl, canonicalUrl].filter(Boolean))];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.startsWith("image/")) {
        return {
          playerId: player.player_id,
          url,
          replacement: currentUrl !== url,
        };
      }
    } catch {
      // Try the canonical provider URL when a stored URL is unavailable.
    }
  }

  return null;
}

async function mapConcurrent(items, mapper, limit) {
  const output = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

try {
  const { rows: players } = await pool.query(`
    SELECT player_id, photo_url
    FROM player
    WHERE $1::boolean OR NULLIF(BTRIM(photo_url), '') IS NULL
    ORDER BY player_id
  `, [verifyAll]);

  const initialResults = await mapConcurrent(players, verifyPhoto, concurrency);
  const verifiedById = new Map(
    initialResults.filter(Boolean).map((result) => [result.playerId, result])
  );
  let unavailablePlayers = players.filter(
    (player) => !verifiedById.has(player.player_id)
  );

  for (const retryConcurrency of [15, 5]) {
    if (unavailablePlayers.length === 0) break;
    const retryResults = await mapConcurrent(
      unavailablePlayers,
      verifyPhoto,
      retryConcurrency
    );
    for (const result of retryResults.filter(Boolean)) {
      verifiedById.set(result.playerId, result);
    }
    unavailablePlayers = unavailablePlayers.filter(
      (player) => !verifiedById.has(player.player_id)
    );
  }

  const verified = Array.from(verifiedById.values());
  const updates = verified.filter((player) => player.replacement);

  if (shouldApply && updates.length > 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const player of updates) {
        await client.query(
          `UPDATE player
           SET photo_url = $1
           WHERE player_id = $2`,
          [player.url, player.playerId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(JSON.stringify({
    mode: shouldApply ? "apply" : "dry-run",
    scope: verifyAll ? "all players" : "missing photos",
    checked: players.length,
    verified: verified.length,
    unavailable: players.length - verified.length,
    unavailablePlayerIds: unavailablePlayers.map((player) => player.player_id),
    replacementsAvailable: updates.length,
    updated: shouldApply ? updates.length : 0,
  }, null, 2));
} finally {
  await pool.end();
}
