import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const sqlPath = path.join(process.cwd(), 'database', 'cse216_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying database/cse216_setup.sql to PostgreSQL database...');
  await pool.query(sql);
  console.log('✅ SQL executed successfully!');

  // Verify triggers
  const triggers = await pool.query(`
    SELECT trigger_name, event_manipulation, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name;
  `);
  console.log('\n--- VERIFIED TRIGGERS ---');
  console.table(triggers.rows);

  // Verify functions and procedures
  const routines = await pool.query(`
    SELECT routine_name, routine_type, data_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);
  console.log('\n--- VERIFIED FUNCTIONS & PROCEDURES ---');
  console.table(routines.rows);

  // Test Functions
  console.log('\n--- TESTING FUNCTIONS ---');
  const winRateTest = await pool.query(`SELECT team_id, name, fn_calculate_team_win_rate(team_id) AS win_rate FROM team LIMIT 3;`);
  console.table(winRateTest.rows);

  const formTest = await pool.query(`SELECT team_id, name, fn_get_team_recent_form(team_id, 5) AS recent_form FROM team LIMIT 3;`);
  console.table(formTest.rows);

  const playerStatsTest = await pool.query(`SELECT player_id, first_name, last_name, (fn_get_player_career_summary(player_id)).* FROM player LIMIT 3;`);
  console.table(playerStatsTest.rows);

  // Test Audit Table
  const auditCount = await pool.query(`SELECT COUNT(*) FROM audit_log;`);
  console.log('\nAudit log row count:', auditCount.rows[0].count);

  await pool.end();
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
