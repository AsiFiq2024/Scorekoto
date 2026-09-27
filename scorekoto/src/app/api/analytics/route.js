import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/analytics
// Supports optional ?league_id=39 and ?type=standings|top_scorers|head_to_head|all
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryType = searchParams.get('type') || 'all';
    const leagueIdParam = searchParams.get('league_id');
    const leagueId = leagueIdParam && !isNaN(Number(leagueIdParam)) && Number(leagueIdParam) > 0 ? Number(leagueIdParam) : null;

    const results = {};

    // Available leagues for selection
    const leaguesRes = await pool.query(`
      SELECT DISTINCT l.league_id, l.name, l.country, l.logo_url
      FROM league l
      JOIN season s ON l.league_id = s.league_id
      JOIN team_season_stats tss ON s.season_id = tss.season_id
      WHERE l.league_id IN (39, 140, 135, 78, 61, 2)
      ORDER BY 
        CASE 
          WHEN l.league_id = 39 THEN 1
          WHEN l.league_id = 140 THEN 2
          WHEN l.league_id = 135 THEN 3
          WHEN l.league_id = 78 THEN 4
          WHEN l.league_id = 61 THEN 5
          WHEN l.league_id = 2 THEN 6
          ELSE 7
        END;
    `);
    results.leagues = leaguesRes.rows;

    // -----------------------------------------------------------------
    // COMPLEX QUERY 1: League Standings & Performance Analytics
    // Joins: team, team_season_stats, season, league
    // Aggregation/Window: DENSE_RANK() OVER (...), PL/pgSQL fn_calculate_team_win_rate, fn_get_team_recent_form
    // -----------------------------------------------------------------
    if (queryType === 'all' || queryType === 'standings') {
      let standingsQuery;
      let standingsParams = [];

      if (leagueId) {
        standingsQuery = `
          SELECT 
            l.name AS league_name,
            l.league_id,
            s.year AS season_year,
            t.team_id,
            t.name AS team_name,
            t.short_name,
            t.logo_url,
            tss.matches_played,
            tss.wins,
            tss.draws,
            tss.losses,
            tss.goals_for,
            tss.goals_against,
            (tss.goals_for - tss.goals_against) AS goal_difference,
            tss.points,
            DENSE_RANK() OVER (
              PARTITION BY s.season_id 
              ORDER BY tss.points DESC, (tss.goals_for - tss.goals_against) DESC, tss.goals_for DESC
            ) AS league_rank,
            fn_calculate_team_win_rate(t.team_id) AS overall_win_percentage,
            fn_get_team_recent_form(t.team_id, 5) AS recent_form
          FROM team_season_stats tss
          JOIN team t ON tss.team_id = t.team_id
          JOIN season s ON tss.season_id = s.season_id
          JOIN league l ON s.league_id = l.league_id
          WHERE l.league_id = $1
            AND s.season_id = (
              SELECT s2.season_id 
              FROM season s2 
              JOIN team_season_stats tss2 ON s2.season_id = tss2.season_id
              WHERE s2.league_id = $1 
              ORDER BY s2.year DESC 
              LIMIT 1
            )
          ORDER BY league_rank ASC;
        `;
        standingsParams = [leagueId];
      } else {
        standingsQuery = `
          SELECT 
            l.name AS league_name,
            l.league_id,
            s.year AS season_year,
            t.team_id,
            t.name AS team_name,
            t.short_name,
            t.logo_url,
            tss.matches_played,
            tss.wins,
            tss.draws,
            tss.losses,
            tss.goals_for,
            tss.goals_against,
            (tss.goals_for - tss.goals_against) AS goal_difference,
            tss.points,
            DENSE_RANK() OVER (
              PARTITION BY s.season_id 
              ORDER BY tss.points DESC, (tss.goals_for - tss.goals_against) DESC, tss.goals_for DESC
            ) AS league_rank,
            fn_calculate_team_win_rate(t.team_id) AS overall_win_percentage,
            fn_get_team_recent_form(t.team_id, 5) AS recent_form
          FROM team_season_stats tss
          JOIN team t ON tss.team_id = t.team_id
          JOIN season s ON tss.season_id = s.season_id
          JOIN league l ON s.league_id = l.league_id
          WHERE l.league_id IN (39, 140, 135, 78, 61)
            AND s.season_id = (
              SELECT s2.season_id 
              FROM season s2 
              JOIN team_season_stats tss2 ON s2.season_id = tss2.season_id
              WHERE s2.league_id = l.league_id 
              ORDER BY s2.year DESC 
              LIMIT 1
            )
          ORDER BY 
            CASE 
              WHEN l.league_id = 39 THEN 1
              WHEN l.league_id = 140 THEN 2
              WHEN l.league_id = 135 THEN 3
              WHEN l.league_id = 78 THEN 4
              WHEN l.league_id = 61 THEN 5
              ELSE 6
            END,
            league_rank ASC
          LIMIT 100;
        `;
      }
      const standingsRes = await pool.query(standingsQuery, standingsParams);
      results.standings = standingsRes.rows;
    }

    // -----------------------------------------------------------------
    // COMPLEX QUERY 2: Top Scorers & Career Contributions Leaderboard
    // Joins: player, team, player_season_stats, season, league
    // Aggregation: SUM(goals), SUM(assists), AVG(minutes), COUNT(DISTINCT season_id)
    // Filter: GROUP BY with HAVING clause
    // -----------------------------------------------------------------
    if (queryType === 'all' || queryType === 'top_scorers') {
      let topScorersQuery;
      let scorersParams = [];

      if (leagueId) {
        topScorersQuery = `
          SELECT 
            p.player_id,
            CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS player_name,
            p.primary_position,
            p.nationality,
            p.photo_url,
            t.name AS current_team,
            t.logo_url AS team_logo,
            l.name AS league_name,
            l.league_id,
            SUM(pss.appearances) AS total_appearances,
            SUM(pss.goals) AS total_goals,
            SUM(pss.assists) AS total_assists,
            SUM(pss.goals + pss.assists) AS total_contributions,
            SUM(pss.yellow_cards) AS total_yellow_cards,
            SUM(pss.red_cards) AS total_red_cards,
            ROUND(AVG(pss.minutes_played)::numeric, 0) AS avg_minutes_played,
            COUNT(DISTINCT pss.season_id) AS active_seasons_count
          FROM player p
          JOIN player_season_stats pss ON p.player_id = pss.player_id
          JOIN season s ON pss.season_id = s.season_id
          JOIN league l ON s.league_id = l.league_id
          LEFT JOIN team t ON p.team_id = t.team_id
          WHERE l.league_id = $1
          GROUP BY p.player_id, p.first_name, p.last_name, p.primary_position, p.nationality, p.photo_url, t.name, t.logo_url, l.name, l.league_id
          HAVING SUM(pss.goals + pss.assists) > 0
          ORDER BY total_goals DESC, total_assists DESC
          LIMIT 30;
        `;
        scorersParams = [leagueId];
      } else {
        topScorersQuery = `
          SELECT 
            p.player_id,
            CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS player_name,
            p.primary_position,
            p.nationality,
            p.photo_url,
            t.name AS current_team,
            t.logo_url AS team_logo,
            MAX(l.name) AS league_name,
            SUM(pss.appearances) AS total_appearances,
            SUM(pss.goals) AS total_goals,
            SUM(pss.assists) AS total_assists,
            SUM(pss.goals + pss.assists) AS total_contributions,
            SUM(pss.yellow_cards) AS total_yellow_cards,
            SUM(pss.red_cards) AS total_red_cards,
            ROUND(AVG(pss.minutes_played)::numeric, 0) AS avg_minutes_played,
            COUNT(DISTINCT pss.season_id) AS active_seasons_count
          FROM player p
          JOIN player_season_stats pss ON p.player_id = pss.player_id
          JOIN season s ON pss.season_id = s.season_id
          JOIN league l ON s.league_id = l.league_id
          LEFT JOIN team t ON p.team_id = t.team_id
          GROUP BY p.player_id, p.first_name, p.last_name, p.primary_position, p.nationality, p.photo_url, t.name, t.logo_url
          HAVING SUM(pss.goals + pss.assists) > 0
          ORDER BY total_contributions DESC, total_goals DESC
          LIMIT 30;
        `;
      }
      const scorersRes = await pool.query(topScorersQuery, scorersParams);
      results.top_scorers = scorersRes.rows;
    }

    // -----------------------------------------------------------------
    // COMPLEX QUERY 3: Team Head-to-Head & Rivalry Aggregations
    // Joins: match, team (home_team), team (away_team), season, league
    // Aggregation: Multi-column conditional CASE WHEN aggregation
    // -----------------------------------------------------------------
    if (queryType === 'all' || queryType === 'head_to_head') {
      let headToHeadQuery;
      let h2hParams = [];

      if (leagueId) {
        headToHeadQuery = `
          SELECT 
            ht.team_id AS home_team_id,
            ht.name AS home_team_name,
            ht.logo_url AS home_logo,
            at.team_id AS away_team_id,
            at.name AS away_team_name,
            at.logo_url AS away_logo,
            COUNT(m.match_id) AS total_encounters,
            COUNT(CASE WHEN m.home_score > m.away_score THEN 1 END) AS home_team_wins,
            COUNT(CASE WHEN m.away_score > m.home_score THEN 1 END) AS away_team_wins,
            COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) AS draws,
            SUM(m.home_score) AS total_home_goals,
            SUM(m.away_score) AS total_away_goals,
            ROUND(AVG(m.home_score + m.away_score)::numeric, 2) AS avg_goals_per_encounter,
            ROUND(AVG(m.home_possession)::numeric, 1) AS avg_home_possession_pct
          FROM match m
          JOIN team ht ON m.home_team_id = ht.team_id
          JOIN team at ON m.away_team_id = at.team_id
          JOIN season s ON m.season_id = s.season_id
          WHERE m.status IN ('FT', 'AET', 'PEN')
            AND m.home_score IS NOT NULL 
            AND m.away_score IS NOT NULL
            AND s.league_id = $1
          GROUP BY ht.team_id, ht.name, ht.logo_url, at.team_id, at.name, at.logo_url
          HAVING COUNT(m.match_id) >= 1
          ORDER BY total_encounters DESC, (SUM(m.home_score) + SUM(m.away_score)) DESC
          LIMIT 25;
        `;
        h2hParams = [leagueId];
      } else {
        headToHeadQuery = `
          SELECT 
            ht.team_id AS home_team_id,
            ht.name AS home_team_name,
            ht.logo_url AS home_logo,
            at.team_id AS away_team_id,
            at.name AS away_team_name,
            at.logo_url AS away_logo,
            COUNT(m.match_id) AS total_encounters,
            COUNT(CASE WHEN m.home_score > m.away_score THEN 1 END) AS home_team_wins,
            COUNT(CASE WHEN m.away_score > m.home_score THEN 1 END) AS away_team_wins,
            COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) AS draws,
            SUM(m.home_score) AS total_home_goals,
            SUM(m.away_score) AS total_away_goals,
            ROUND(AVG(m.home_score + m.away_score)::numeric, 2) AS avg_goals_per_encounter,
            ROUND(AVG(m.home_possession)::numeric, 1) AS avg_home_possession_pct
          FROM match m
          JOIN team ht ON m.home_team_id = ht.team_id
          JOIN team at ON m.away_team_id = at.team_id
          WHERE m.status IN ('FT', 'AET', 'PEN')
            AND m.home_score IS NOT NULL 
            AND m.away_score IS NOT NULL
          GROUP BY ht.team_id, ht.name, ht.logo_url, at.team_id, at.name, at.logo_url
          HAVING COUNT(m.match_id) >= 1
          ORDER BY total_encounters DESC, (SUM(m.home_score) + SUM(m.away_score)) DESC
          LIMIT 25;
        `;
      }
      const h2hRes = await pool.query(headToHeadQuery, h2hParams);
      results.head_to_head = h2hRes.rows;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      league_id: leagueId,
      analytics: results,
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to execute analytics complex queries' },
      { status: 500 }
    );
  }
}
