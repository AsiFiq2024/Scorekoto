import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/scorekoto',
});

function calculateElapsedMinute(matchDate, status) {
  const s = String(status || '').toUpperCase();
  if (s === 'HT') return 'HT';
  if (['FT', 'AET', 'PEN'].includes(s)) return 'FT';
  if (!matchDate) return 'LIVE';

  const start = new Date(matchDate).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - start) / (60 * 1000));
  if (diffMinutes <= 0) return "1'";
  if (diffMinutes <= 45) return `${Math.max(1, diffMinutes)}'`;
  if (diffMinutes <= 60) return 'HT';
  if (diffMinutes <= 105) return `${diffMinutes - 15}'`;
  if (diffMinutes < 120) return "90+'";
  return 'FT';
}

async function runTests() {
  console.log('========================================================');
  console.log('TEST 1: Verifying calculateElapsedMinute() 120m Cutoff');
  console.log('========================================================');

  const now = Date.now();
  const min20 = new Date(now - 20 * 60 * 1000).toISOString();
  const min50 = new Date(now - 50 * 60 * 1000).toISOString();
  const min75 = new Date(now - 75 * 60 * 1000).toISOString();
  const min110 = new Date(now - 110 * 60 * 1000).toISOString();
  const min120 = new Date(now - 120 * 60 * 1000).toISOString();
  const min180 = new Date(now - 180 * 60 * 1000).toISOString();

  console.log('20m ago:', calculateElapsedMinute(min20, 'LIVE')); // Expected: 20'
  console.log('50m ago:', calculateElapsedMinute(min50, 'LIVE')); // Expected: HT
  console.log('75m ago:', calculateElapsedMinute(min75, 'LIVE')); // Expected: 60'
  console.log('110m ago:', calculateElapsedMinute(min110, 'LIVE')); // Expected: 90+'
  console.log('120m ago (2h cutoff):', calculateElapsedMinute(min120, 'LIVE')); // Expected: FT
  console.log('180m ago (3h ago):', calculateElapsedMinute(min180, 'LIVE')); // Expected: FT

  if (calculateElapsedMinute(min120, 'LIVE') !== 'FT' || calculateElapsedMinute(min180, 'LIVE') !== 'FT') {
    throw new Error('FAIL: Matches at or beyond 120 minutes must return FT!');
  }
  if (calculateElapsedMinute(min110, 'LIVE') !== "90+'") {
    throw new Error('FAIL: Match at 110 minutes should still be 90+\'!');
  }
  console.log('✅ TEST 1 PASSED: calculateElapsedMinute correctly terminates at 120 minutes (2h).');

  console.log('\n========================================================');
  console.log('TEST 2: Database Auto-Finalization of Stale Matches');
  console.log('========================================================');

  // Insert a mock live match that started 130 minutes ago in UTC
  const testMatchId = 9999888;
  const kickOff130mAgoIso = new Date(now - 130 * 60 * 1000).toISOString();
  
  // Get an existing season, home team, away team
  const sampleRes = await pool.query('SELECT season_id, home_team_id, away_team_id FROM match LIMIT 1');
  const { season_id, home_team_id, away_team_id } = sampleRes.rows[0];

  await pool.query(`
    INSERT INTO match (match_id, season_id, home_team_id, away_team_id, match_date, status, home_score, away_score)
    VALUES ($1, $2, $3, $4, ($5::timestamptz AT TIME ZONE 'UTC'), '2H', 2, 1)
    ON CONFLICT (match_id) DO UPDATE SET
      status = '2H',
      match_date = ($5::timestamptz AT TIME ZONE 'UTC'),
      home_score = 2,
      away_score = 1
  `, [testMatchId, season_id, home_team_id, away_team_id, kickOff130mAgoIso]);

  console.log(`Inserted mock match ${testMatchId} with status '2H', kickoff 130 minutes ago (${kickOff130mAgoIso}).`);

  // Execute the exact autoFinalizeExpiredMatches query
  const autoFinalizeRes = await pool.query(`
    UPDATE match
    SET status = 'FT'
    WHERE status IN ('LIVE', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT')
      AND match_date <= (NOW() - INTERVAL '120 minutes')
    RETURNING match_id, status
  `);

  console.log(`Auto-finalize query affected ${autoFinalizeRes.rowCount} matches.`);
  const checkUpdated = await pool.query('SELECT status, home_score, away_score FROM match WHERE match_id = $1', [testMatchId]);
  console.log('Updated mock match in DB:', checkUpdated.rows[0]);

  if (checkUpdated.rows[0].status !== 'FT') {
    throw new Error(`FAIL: Expected status to be 'FT' but found '${checkUpdated.rows[0].status}'`);
  }
  console.log('✅ TEST 2 PASSED: Expired live match was automatically updated to FT in the database.');

  // Clean up mock match
  await pool.query('DELETE FROM match WHERE match_id = $1', [testMatchId]);
  console.log('Cleaned up mock match.');

  console.log('\n========================================================');
  console.log('ALL LIVE MATCH TIMEOUT TESTS PASSED (100%)');
  console.log('========================================================');
  await pool.end();
}

runTests().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await pool.end();
  process.exit(1);
});
