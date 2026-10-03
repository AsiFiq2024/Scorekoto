import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const applyChanges = process.argv.includes('--apply');

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

const client = await pool.connect();

try {
  const repeatedNames = await client.query(`
    SELECT player_id, first_name, last_name
    FROM player
    WHERE NULLIF(BTRIM(first_name), '') IS NOT NULL
      AND LOWER(BTRIM(first_name)) = LOWER(BTRIM(last_name))
    ORDER BY player_id
  `);

  const invalidTestPlayers = await client.query(`
    SELECT player_id, first_name, last_name
    FROM player p
    WHERE p.player_id = 525042
      AND LOWER(BTRIM(p.first_name)) = 'wdeads'
      AND LOWER(BTRIM(p.last_name)) = 'sadads'
      AND NOT EXISTS (SELECT 1 FROM player_season_stats pss WHERE pss.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM match_lineup ml WHERE ml.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM match_event me WHERE me.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM player_injury pi WHERE pi.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM user_favorite_player ufp WHERE ufp.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM team_squad_member tsm WHERE tsm.player_id = p.player_id)
      AND NOT EXISTS (SELECT 1 FROM news n WHERE n.player_id = p.player_id)
  `);

  if (applyChanges && (repeatedNames.rows.length > 0 || invalidTestPlayers.rows.length > 0)) {
    await client.query('BEGIN');
    await client.query(`
      UPDATE player
      SET last_name = ''
      WHERE NULLIF(BTRIM(first_name), '') IS NOT NULL
        AND LOWER(BTRIM(first_name)) = LOWER(BTRIM(last_name))
    `);
    await client.query(`
      DELETE FROM player p
      WHERE p.player_id = 525042
        AND LOWER(BTRIM(p.first_name)) = 'wdeads'
        AND LOWER(BTRIM(p.last_name)) = 'sadads'
        AND NOT EXISTS (SELECT 1 FROM player_season_stats pss WHERE pss.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM match_lineup ml WHERE ml.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM match_event me WHERE me.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM player_injury pi WHERE pi.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM user_favorite_player ufp WHERE ufp.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM team_squad_member tsm WHERE tsm.player_id = p.player_id)
        AND NOT EXISTS (SELECT 1 FROM news n WHERE n.player_id = p.player_id)
    `);
    await client.query('COMMIT');
  }

  console.log(JSON.stringify({
    mode: applyChanges ? 'applied' : 'dry-run',
    normalizedRepeatedNames: repeatedNames.rows.map((player) => ({
      playerId: player.player_id,
      from: `${player.first_name} ${player.last_name}`,
      to: player.first_name,
    })),
    removedInvalidTestPlayers: invalidTestPlayers.rows.map((player) => ({
      playerId: player.player_id,
      name: `${player.first_name} ${player.last_name}`,
    })),
  }, null, 2));
} catch (error) {
  if (applyChanges) {
    await client.query('ROLLBACK').catch(() => {});
  }
  throw error;
} finally {
  client.release();
  await pool.end();
}
