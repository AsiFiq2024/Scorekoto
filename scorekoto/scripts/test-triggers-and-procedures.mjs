import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) {
        connectionString = line.substring('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
        break;
      }
    }
  } catch (e) {
    // ignore
  }
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- 1. TESTING TRIGGER: Audit Log on INSERT, UPDATE, DELETE ---');
  const insertRes = await pool.query(`
    INSERT INTO player (first_name, last_name, primary_position)
    VALUES ('CSE216_Test', 'Player', 'Striker')
    RETURNING player_id;
  `);
  const testPlayerId = insertRes.rows[0].player_id;
  console.log(`Inserted test player with ID: ${testPlayerId}`);

  await pool.query(
    `UPDATE player SET market_value_euros = 25000000 WHERE player_id = $1`,
    [testPlayerId]
  );
  console.log(`Updated test player market value.`);

  await pool.query(`DELETE FROM player WHERE player_id = $1`, [testPlayerId]);
  console.log(`Deleted test player.`);

  const auditLogs = await pool.query(
    `SELECT log_id, table_name, operation, record_id, changed_at 
     FROM audit_log 
     WHERE record_id = $1 
     ORDER BY log_id ASC`,
    [testPlayerId.toString()]
  );
  console.log('\nAudit Log Records created by trigger:');
  console.table(auditLogs.rows);

  console.log('\n--- 2. TESTING TRIGGER: Validation on Negative Scores ---');
  try {
    await pool.query(`
      INSERT INTO match (season_id, home_team_id, away_team_id, status, home_score, away_score)
      VALUES (
        (SELECT season_id FROM season LIMIT 1),
        (SELECT team_id FROM team LIMIT 1),
        (SELECT team_id FROM team OFFSET 1 LIMIT 1),
        'FT', -2, 3
      )
    `);
    console.error('❌ Error: Trigger failed to prevent negative scores!');
  } catch (err) {
    console.log(`✅ Success: Validation Trigger correctly blocked invalid match score: "${err.message}"`);
  }

  console.log('\n--- 3. TESTING PROCEDURE: sp_delete_match_cascade ---');
  // Create a temporary match and test cascade deletion procedure
  const matchInsert = await pool.query(`
    INSERT INTO match (season_id, home_team_id, away_team_id, status, home_score, away_score)
    VALUES (
      (SELECT season_id FROM season LIMIT 1),
      (SELECT team_id FROM team LIMIT 1),
      (SELECT team_id FROM team OFFSET 1 LIMIT 1),
      'NS', 0, 0
    )
    RETURNING match_id;
  `);
  const testMatchId = matchInsert.rows[0].match_id;
  console.log(`Created test match #${testMatchId}`);

  // Insert a test comment on the match
  await pool.query(`
    INSERT INTO match_comment (match_id, username, comment_text, reaction)
    VALUES ($1, 'Tester', 'Great match!', '🔥')
  `, [testMatchId]);
  console.log(`Added test comment for match #${testMatchId}`);

  // Call the cascade delete procedure
  await pool.query(`CALL sp_delete_match_cascade($1)`, [testMatchId]);
  console.log(`✅ Stored procedure sp_delete_match_cascade executed successfully!`);

  const checkMatch = await pool.query(`SELECT match_id FROM match WHERE match_id = $1`, [testMatchId]);
  const checkComment = await pool.query(`SELECT comment_id FROM match_comment WHERE match_id = $1`, [testMatchId]);
  console.log(`Match remaining count: ${checkMatch.rows.length}, Comments remaining count: ${checkComment.rows.length}`);

  console.log('\n--- 4. TESTING PROCEDURE: sp_transfer_player ---');
  await pool.query(`DELETE FROM player WHERE first_name = 'Transfer' AND last_name = 'Target'`);
  const dummyPlayer = await pool.query(`
    INSERT INTO player (first_name, last_name, team_id, market_value_euros)
    VALUES ('Transfer', 'Target', (SELECT team_id FROM team ORDER BY team_id ASC LIMIT 1), 10000000)
    RETURNING player_id, team_id;
  `);
  const transferPlayerId = dummyPlayer.rows[0].player_id;
  const oldTeamId = dummyPlayer.rows[0].team_id;
  const newTeam = await pool.query(`SELECT team_id, name FROM team WHERE team_id != $1 ORDER BY team_id ASC LIMIT 1`, [oldTeamId]);
  const newTeamId = newTeam.rows[0].team_id;

  console.log(`Transferring Player #${transferPlayerId} from Team #${oldTeamId} to Team #${newTeamId} (${newTeam.rows[0].name})...`);
  await pool.query(`CALL sp_transfer_player($1, $2, $3)`, [transferPlayerId, newTeamId, 35000000]);
  console.log(`✅ Stored procedure sp_transfer_player executed successfully!`);

  const updatedPlayerRes = await pool.query(`SELECT player_id, team_id, market_value_euros, transfer_history FROM player WHERE player_id = $1`, [transferPlayerId]);
  console.log('Player after transfer:', updatedPlayerRes.rows[0]);

  // Clean up
  await pool.query(`DELETE FROM player WHERE player_id = $1`, [transferPlayerId]);

  console.log('\n--- 5. TESTING TRIGGER: Duplicate Player Prevention (trg_prevent_duplicate_player) ---');
  const dupTestFirst = await pool.query(`
    INSERT INTO player (first_name, last_name, team_id, primary_position)
    VALUES ('Trigger', 'DuplicateTest', 50, 'Midfielder')
    RETURNING player_id;
  `);
  const dupFirstId = dupTestFirst.rows[0].player_id;
  console.log(`Created primary test player #${dupFirstId}`);

  try {
    await pool.query(`
      INSERT INTO player (first_name, last_name, team_id, primary_position)
      VALUES ('Trigger', 'DuplicateTest', 50, 'Midfielder');
    `);
    console.error('❌ Error: Trigger failed to prevent duplicate player insertion!');
  } catch (dupErr) {
    console.log(`✅ Success: Duplicate Prevention Trigger blocked duplicate player: "${dupErr.message}"`);
  }

  // Clean up test player
  await pool.query(`DELETE FROM player WHERE player_id = $1`, [dupFirstId]);
  console.log(`Cleaned up test player #${dupFirstId}.`);

  await pool.end();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
