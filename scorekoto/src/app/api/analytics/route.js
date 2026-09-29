import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/analytics - Executes the 3 Checkpoint 7 Complex Queries
export async function GET() {
  try {
    // -------------------------------------------------------------
    // Complex Query 1: League Standings & Form Analytics
    // Joined: team_season_stats, team, season, league (4 tables)
    // Features: DENSE_RANK() Window Function + Calls to 2 PL/pgSQL functions
    // -------------------------------------------------------------
    const q1 = await pool.query(`
      SELECT 
        l.name AS league_name,
        s.year AS season_year,
        t.team_id,
        t.name AS team_name,
        t.logo_url,
        tss.points,
        tss.wins,
        tss.losses,
        tss.draws,
        tss.goals_for,
        tss.goals_against,
        (tss.goals_for - tss.goals_against) AS goal_difference,
        DENSE_RANK() OVER (
          PARTITION BY s.season_id 
          ORDER BY tss.points DESC, (tss.goals_for - tss.goals_against) DESC, tss.goals_for DESC
        ) AS rank,
        fn_calculate_team_win_rate(t.team_id) AS win_rate,
        fn_get_team_recent_form(t.team_id, 5) AS form
      FROM team_season_stats tss
      JOIN team t ON tss.team_id = t.team_id
      JOIN season s ON tss.season_id = s.season_id
      JOIN league l ON s.league_id = l.league_id
      ORDER BY s.year DESC, rank ASC
      LIMIT 15;
    `);

    // -------------------------------------------------------------
    // Complex Query 2: Top Scorers / Goal Contributors
    // Joined: player, player_season_stats, team (3 tables)
    // Features: Multi-column aggregation, GROUP BY, and HAVING condition
    // -------------------------------------------------------------
    const q2 = await pool.query(`
      SELECT 
        p.player_id,
        CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS player_name,
        p.photo_url,
        p.primary_position,
        t.name AS team_name,
        SUM(pss.appearances) AS appearances,
        SUM(pss.goals) AS total_goals,
        SUM(pss.assists) AS total_assists,
        SUM(pss.goals + pss.assists) AS total_contributions,
        ROUND(AVG(pss.minutes_played), 0) AS avg_minutes
      FROM player p
      JOIN player_season_stats pss ON p.player_id = pss.player_id
      LEFT JOIN team t ON p.team_id = t.team_id
      GROUP BY p.player_id, p.first_name, p.last_name, p.photo_url, p.primary_position, t.name
      HAVING SUM(pss.goals + pss.assists) > 0
      ORDER BY total_contributions DESC, total_goals DESC
      LIMIT 10;
    `);

    // -------------------------------------------------------------
    // Complex Query 3: Team Rivalry & Head-to-Head Statistics
    // Joined: match, team (ht), team (at) (3 tables / self-join)
    // Features: Conditional aggregation CASE WHEN, GROUP BY, and HAVING condition
    // -------------------------------------------------------------
    const q3 = await pool.query(`
      SELECT 
        ht.name AS home_team,
        at.name AS away_team,
        COUNT(m.match_id) AS encounters,
        COUNT(CASE WHEN m.home_score > m.away_score THEN 1 END) AS home_wins,
        COUNT(CASE WHEN m.away_score > m.home_score THEN 1 END) AS away_wins,
        COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) AS draws,
        SUM(m.home_score) AS home_goals,
        SUM(m.away_score) AS away_goals,
        ROUND(AVG(COALESCE(m.home_possession, 50)), 1) AS avg_home_possession
      FROM match m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      WHERE m.status IN ('FT', 'AET', 'PEN')
      GROUP BY ht.name, at.name
      HAVING COUNT(m.match_id) >= 2
      ORDER BY encounters DESC, (SUM(m.home_score) + SUM(m.away_score)) DESC
      LIMIT 10;
    `);

    return NextResponse.json(
      {
        success: true,
        queries: {
          leagueStandings: q1.rows,
          topContributors: q2.rows,
          headToHeadRivalries: q3.rows,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Error executing complex analytics queries:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
