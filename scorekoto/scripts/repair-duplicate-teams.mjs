import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const shouldApply = process.argv.includes("--apply");

if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

const repairs = [
  {
    canonicalId: 1110,
    duplicateId: 15456011,
    name: "Andorra",
    shortName: "AND",
    stadium: "Estadi de la FAF",
  },
  {
    canonicalId: 1112,
    duplicateId: 15456012,
    name: "Malta",
    shortName: "MLT",
    stadium: "National Stadium, Ta' Qali",
  },
];

async function dependentCount(queryable, teamId) {
  const { rows } = await queryable.query(
    `SELECT (
       (SELECT COUNT(*) FROM match WHERE home_team_id = $1 OR away_team_id = $1) +
       (SELECT COUNT(*) FROM player WHERE team_id = $1) +
       (SELECT COUNT(*) FROM player_season_stats WHERE team_id = $1) +
       (SELECT COUNT(*) FROM team_season_stats WHERE team_id = $1) +
       (SELECT COUNT(*) FROM team_squad_member WHERE team_id = $1) +
       (SELECT COUNT(*) FROM team_squad_sync WHERE team_id = $1) +
       (SELECT COUNT(*) FROM user_favorite_team WHERE team_id = $1) +
       (SELECT COUNT(*) FROM team_trophy WHERE team_id = $1) +
       (SELECT COUNT(*) FROM news WHERE team_id = $1) +
       (SELECT COUNT(*) FROM processed_teams_players WHERE team_id = $1)
     )::int AS count`,
    [teamId]
  );
  return rows[0].count;
}

try {
  const preview = [];
  for (const repair of repairs) {
    const { rows } = await pool.query(
      `SELECT team_id, name, short_name, stadium_name, logo_url
       FROM team
       WHERE team_id = ANY($1::int[])
       ORDER BY team_id`,
      [[repair.canonicalId, repair.duplicateId]]
    );
    preview.push({
      ...repair,
      rows,
      duplicateDependentCount: await dependentCount(pool, repair.duplicateId),
    });
  }

  if (shouldApply) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const repair of repairs) {
        const { rows } = await client.query(
          `SELECT team_id, name
           FROM team
           WHERE team_id = ANY($1::int[])
           ORDER BY team_id
           FOR UPDATE`,
          [[repair.canonicalId, repair.duplicateId]]
        );
        if (
          rows.length !== 2 ||
          rows.some((row) => row.name !== repair.name) ||
          await dependentCount(client, repair.duplicateId) !== 0
        ) {
          throw new Error(`Duplicate-team precondition failed for ${repair.name}`);
        }

        await client.query(
          `UPDATE team
           SET short_name = $1, stadium_name = $2
           WHERE team_id = $3`,
          [repair.shortName, repair.stadium, repair.canonicalId]
        );
        await client.query(
          `DELETE FROM team WHERE team_id = $1 AND name = $2`,
          [repair.duplicateId, repair.name]
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
    repairs: preview,
  }, null, 2));
} finally {
  await pool.end();
}
