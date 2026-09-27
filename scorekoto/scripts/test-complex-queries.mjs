import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  console.log('--- COMPLEX QUERY 1: Standings with DENSE_RANK and PL/pgSQL Function Calls ---');
  const q1 = await pool.query(`
    SELECT 
      l.name AS league_name,
      s.year AS season_year,
      t.name AS team_name,
      tss.points,
      tss.wins,
      tss.losses,
      tss.draws,
      DENSE_RANK() OVER (PARTITION BY s.season_id ORDER BY tss.points DESC) AS rank,
      fn_calculate_team_win_rate(t.team_id) AS win_rate,
      fn_get_team_recent_form(t.team_id, 5) AS form
    FROM team_season_stats tss
    JOIN team t ON tss.team_id = t.team_id
    JOIN season s ON tss.season_id = s.season_id
    JOIN league l ON s.league_id = l.league_id
    ORDER BY s.year DESC, rank ASC
    LIMIT 3;
  `);
  console.table(q1.rows);

  console.log('\n--- COMPLEX QUERY 2: Top Scorers / Goal Contributors with Aggregation & HAVING ---');
  const q2 = await pool.query(`
    SELECT 
      p.player_id,
      CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS player_name,
      t.name AS team_name,
      SUM(pss.appearances) AS appearances,
      SUM(pss.goals) AS total_goals,
      SUM(pss.assists) AS total_assists,
      SUM(pss.goals + pss.assists) AS total_contributions
    FROM player p
    JOIN player_season_stats pss ON p.player_id = pss.player_id
    LEFT JOIN team t ON p.team_id = t.team_id
    GROUP BY p.player_id, p.first_name, p.last_name, t.name
    HAVING SUM(pss.goals + pss.assists) > 0
    ORDER BY total_contributions DESC
    LIMIT 3;
  `);
  console.table(q2.rows);

  console.log('\n--- COMPLEX QUERY 3: Team Rivalry & Head-to-Head Multi-table Aggregations ---');
  const q3 = await pool.query(`
    SELECT 
      ht.name AS home_team,
      at.name AS away_team,
      COUNT(m.match_id) AS encounters,
      COUNT(CASE WHEN m.home_score > m.away_score THEN 1 END) AS home_wins,
      COUNT(CASE WHEN m.away_score > m.home_score THEN 1 END) AS away_wins,
      COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) AS draws,
      SUM(m.home_score) AS home_goals,
      SUM(m.away_score) AS away_goals
    FROM match m
    JOIN team ht ON m.home_team_id = ht.team_id
    JOIN team at ON m.away_team_id = at.team_id
    WHERE m.status IN ('FT', 'AET', 'PEN')
    GROUP BY ht.name, at.name
    HAVING COUNT(m.match_id) >= 1
    ORDER BY encounters DESC
    LIMIT 3;
  `);
  console.table(q3.rows);

  await pool.end();
}

test().catch(console.error);
