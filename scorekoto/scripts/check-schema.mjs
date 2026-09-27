import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const tables = ['match', 'team_season_stats', 'player_season_stats', 'match_comment', 'users', 'team', 'player'];
  for (const t of tables) {
    const res = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
      [t]
    );
    console.log(`\nTable: ${t}`);
    console.log(res.rows.map((r) => `  - ${r.column_name}: ${r.data_type}`).join('\n'));
  }

  const cons = await pool.query(`
    SELECT conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid IN ('team_season_stats'::regclass, 'match'::regclass, 'player'::regclass);
  `);
  console.log('\nConstraints:');
  console.log(cons.rows);

  await pool.end();
}

check().catch(console.error);
