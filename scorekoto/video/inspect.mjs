import pg from '../node_modules/pg/lib/index.js';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const queries = {
  matches: `SELECT m.match_id, m.match_date, ht.name home, at.name away, m.home_score, m.away_score, jsonb_array_length(coalesce(d.events,'[]')) events, (d.statistics IS NOT NULL AND d.statistics <> '{}'::jsonb) stats, (d.lineups IS NOT NULL AND d.lineups <> '{}'::jsonb) lineups FROM match m JOIN team ht ON ht.team_id=m.home_team_id JOIN team at ON at.team_id=m.away_team_id JOIN match_detail_data d ON d.match_id=m.match_id WHERE jsonb_array_length(coalesce(d.events,'[]'))>0 ORDER BY (d.lineups IS NOT NULL AND d.lineups <> '{}'::jsonb) DESC, m.match_date DESC LIMIT 12`,
  teams: `SELECT t.team_id,t.name,(SELECT count(*) FROM team_squad_member s WHERE s.team_id=t.team_id) squad FROM team t WHERE t.name IN ('Real Madrid','Barcelona','Liverpool','Arsenal','Manchester City')`,
  players: `SELECT p.player_id,p.first_name,p.last_name,sum(s.goals) goals FROM player p JOIN player_season_stats s ON s.player_id=p.player_id GROUP BY p.player_id ORDER BY goals DESC LIMIT 8`,
  dates: `SELECT match_date::date date,count(*) FROM match GROUP BY 1 ORDER BY count(*) DESC LIMIT 5`,
};
try { for (const [name,sql] of Object.entries(queries)) { console.log(name, JSON.stringify((await pool.query(sql)).rows)); } } finally { await pool.end(); }
