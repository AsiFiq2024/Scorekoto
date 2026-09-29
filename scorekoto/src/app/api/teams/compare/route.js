import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export const dynamic = 'force-dynamic';

async function resolveTeamId(param) {
  if (!param) return null;
  const decoded = decodeURIComponent(param).trim().toLowerCase();
  if (Number.isInteger(Number(decoded)) && Number(decoded) > 0) {
    return Number(decoded);
  }
  const res = await pool.query(
    `SELECT team_id FROM team 
     WHERE LOWER(name) = $1 
        OR LOWER(REPLACE(name, ' ', '-')) = $1 
        OR LOWER(short_name) = $1 
     LIMIT 1`,
    [decoded]
  );
  return res.rows[0]?.team_id || null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const team1Param = searchParams.get('team1');
    const team2Param = searchParams.get('team2');

    if (!team1Param) {
      return NextResponse.json(
        { error: 'team1 parameter is required' },
        { status: 400 }
      );
    }

    const team1Id = await resolveTeamId(team1Param);
    if (!team1Id) {
      return NextResponse.json(
        { error: `Team 1 not found: ${team1Param}` },
        { status: 404 }
      );
    }

    // 1. Fetch Suggested Opponents (Teams with match history against team1 first, then top clubs)
    const opponentsRes = await pool.query(
      `WITH rival_matches AS (
         SELECT 
           CASE WHEN m.home_team_id = $1 THEN m.away_team_id ELSE m.home_team_id END as opponent_id,
           COUNT(*)::int as encounters
         FROM match m
         WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
         GROUP BY opponent_id
       )
       SELECT 
         t.team_id as id,
         t.name,
         t.short_name as "shortName",
         t.logo_url as logo,
         COALESCE(rm.encounters, 0)::int as encounters
       FROM team t
       LEFT JOIN rival_matches rm ON t.team_id = rm.opponent_id
       WHERE t.team_id != $1
       ORDER BY encounters DESC, t.name ASC
       LIMIT 30`,
      [team1Id]
    );
    const suggestedOpponents = opponentsRes.rows;

    // Determine team2Id
    let team2Id = team2Param ? await resolveTeamId(team2Param) : null;
    if (!team2Id && suggestedOpponents.length > 0) {
      team2Id = suggestedOpponents[0].id;
    }

    if (!team2Id) {
      return NextResponse.json({
        team1: { id: team1Id },
        team2: null,
        suggestedOpponents,
        message: 'No opponent available for comparison',
      });
    }

    // 2. Query Basic Info for both teams
    const teamsInfoRes = await pool.query(
      `SELECT team_id as id, name, short_name as "shortName", stadium_name as stadium, manager_name as manager, logo_url as logo 
       FROM team WHERE team_id IN ($1, $2)`,
      [team1Id, team2Id]
    );
    const team1Info = teamsInfoRes.rows.find((t) => t.id === team1Id) || { id: team1Id, name: 'Team 1' };
    const team2Info = teamsInfoRes.rows.find((t) => t.id === team2Id) || { id: team2Id, name: 'Team 2' };

    // 3. COMPLEX QUERY 3: Head-to-Head Statistics
    // Multi-table self-join + CASE WHEN conditional aggregations
    const h2hRes = await pool.query(
      `SELECT 
         COUNT(m.match_id)::int as encounters,
         COUNT(CASE WHEN (m.home_team_id = $1 AND m.home_score > m.away_score) OR (m.away_team_id = $1 AND m.away_score > m.home_score) THEN 1 END)::int as "team1Wins",
         COUNT(CASE WHEN (m.home_team_id = $2 AND m.home_score > m.away_score) OR (m.away_team_id = $2 AND m.away_score > m.home_score) THEN 1 END)::int as "team2Wins",
         COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END)::int as draws,
         COALESCE(SUM(CASE WHEN m.home_team_id = $1 THEN m.home_score WHEN m.away_team_id = $1 THEN m.away_score ELSE 0 END), 0)::int as "team1Goals",
         COALESCE(SUM(CASE WHEN m.home_team_id = $2 THEN m.home_score WHEN m.away_team_id = $2 THEN m.away_score ELSE 0 END), 0)::int as "team2Goals",
         ROUND(AVG(CASE WHEN m.home_team_id = $1 THEN m.home_possession WHEN m.away_team_id = $1 THEN m.away_possession ELSE NULL END), 1) as "team1AvgPossession",
         ROUND(AVG(CASE WHEN m.home_team_id = $2 THEN m.home_possession WHEN m.away_team_id = $2 THEN m.away_possession ELSE NULL END), 1) as "team2AvgPossession"
       FROM match m
       WHERE ((m.home_team_id = $1 AND m.away_team_id = $2) OR (m.home_team_id = $2 AND m.away_team_id = $1))
         AND m.status IN ('FT', 'AET', 'PEN')`,
      [team1Id, team2Id]
    );
    const h2hSummary = h2hRes.rows[0] || {
      encounters: 0,
      team1Wins: 0,
      team2Wins: 0,
      draws: 0,
      team1Goals: 0,
      team2Goals: 0,
      team1AvgPossession: null,
      team2AvgPossession: null,
    };

    // Recent H2H fixtures list
    const recentH2H = await pool.query(
      `SELECT 
         m.match_id as id,
         m.match_date as "matchDate",
         m.status,
         m.home_score as "homeScore",
         m.away_score as "awayScore",
         ht.team_id as "homeTeamId",
         ht.name as "homeTeam",
         ht.logo_url as "homeLogo",
         at.team_id as "awayTeamId",
         at.name as "awayTeam",
         at.logo_url as "awayLogo",
         COALESCE(l.name, 'Competition') as league
       FROM match m
       JOIN team ht ON m.home_team_id = ht.team_id
       JOIN team at ON m.away_team_id = at.team_id
       LEFT JOIN season s ON m.season_id = s.season_id
       LEFT JOIN league l ON s.league_id = l.league_id
       WHERE ((m.home_team_id = $1 AND m.away_team_id = $2) OR (m.home_team_id = $2 AND m.away_team_id = $1))
       ORDER BY m.match_date DESC
       LIMIT 8`,
      [team1Id, team2Id]
    );

    // 4. COMPLEX QUERY 1: League Standings & Form Analytics
    // Joined: team_season_stats, season, league
    // Uses: DENSE_RANK() OVER (...) + fn_calculate_team_win_rate() + fn_get_team_recent_form()
    // First, look for a shared season
    const sharedSeasonRes = await pool.query(
      `SELECT s.season_id, l.name as league_name, s.year as season_year
       FROM team_season_stats tss1
       JOIN team_season_stats tss2 ON tss1.season_id = tss2.season_id
       JOIN season s ON tss1.season_id = s.season_id
       JOIN league l ON s.league_id = l.league_id
       WHERE tss1.team_id = $1 AND tss2.team_id = $2
       ORDER BY 
         CASE WHEN l.name ILIKE '%Champions%' THEN 2 ELSE 1 END,
         s.year DESC, s.season_id DESC
       LIMIT 1`,
      [team1Id, team2Id]
    );

    let standingsData = { shared: false, leagueName: null, seasonYear: null, team1: null, team2: null };

    if (sharedSeasonRes.rows.length > 0) {
      const shared = sharedSeasonRes.rows[0];
      standingsData.shared = true;
      standingsData.leagueName = shared.league_name;
      standingsData.seasonYear = shared.season_year;

      const rankedRes = await pool.query(
        `WITH ranked_teams AS (
           SELECT 
             tss.team_id,
             tss.points,
             tss.wins,
             tss.draws,
             tss.losses,
             tss.goals_for as "goalsFor",
             tss.goals_against as "goalsAgainst",
             (tss.goals_for - tss.goals_against) as "goalDifference",
             tss.matches_played as played,
             DENSE_RANK() OVER (
               PARTITION BY tss.season_id 
               ORDER BY tss.points DESC, (tss.goals_for - tss.goals_against) DESC, tss.goals_for DESC
             )::int as rank
           FROM team_season_stats tss
           WHERE tss.season_id = $1
         )
         SELECT 
           rt.*,
           fn_calculate_team_win_rate(rt.team_id) as "winRate",
           fn_get_team_recent_form(rt.team_id, 5) as form
         FROM ranked_teams rt
         WHERE rt.team_id IN ($2, $3)`,
        [shared.season_id, team1Id, team2Id]
      );

      standingsData.team1 = rankedRes.rows.find((r) => r.team_id === team1Id) || null;
      standingsData.team2 = rankedRes.rows.find((r) => r.team_id === team2Id) || null;
    } else {
      // Different leagues: fetch respective latest season rank & stats for each team
      const latestStatsRes = await pool.query(
        `WITH latest_seasons AS (
           SELECT tss.team_id, MAX(tss.season_id) as season_id
           FROM team_season_stats tss
           WHERE tss.team_id IN ($1, $2)
           GROUP BY tss.team_id
         ),
         ranked_teams AS (
           SELECT 
             tss.team_id,
             tss.season_id,
             s.year as season_year,
             l.name as league_name,
             tss.points,
             tss.wins,
             tss.draws,
             tss.losses,
             tss.goals_for as "goalsFor",
             tss.goals_against as "goalsAgainst",
             (tss.goals_for - tss.goals_against) as "goalDifference",
             tss.matches_played as played,
             DENSE_RANK() OVER (
               PARTITION BY tss.season_id 
               ORDER BY tss.points DESC, (tss.goals_for - tss.goals_against) DESC, tss.goals_for DESC
             )::int as rank
           FROM team_season_stats tss
           JOIN season s ON tss.season_id = s.season_id
           JOIN league l ON s.league_id = l.league_id
         )
         SELECT 
           rt.*,
           fn_calculate_team_win_rate(rt.team_id) as "winRate",
           fn_get_team_recent_form(rt.team_id, 5) as form
         FROM ranked_teams rt
         JOIN latest_seasons ls ON rt.team_id = ls.team_id AND rt.season_id = ls.season_id`,
        [team1Id, team2Id]
      );
      standingsData.team1 = latestStatsRes.rows.find((r) => r.team_id === team1Id) || null;
      standingsData.team2 = latestStatsRes.rows.find((r) => r.team_id === team2Id) || null;
    }

    // 5. COMPLEX QUERY 2: Top Scorers Comparison
    // Joined: player, player_season_stats
    // Features: Multi-column aggregation, GROUP BY, and HAVING SUM(...) > 0
    const [t1ScorersRes, t2ScorersRes] = await Promise.all([
      pool.query(
        `SELECT 
           p.player_id as "playerId",
           CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) as name,
           p.photo_url as photo,
           COALESCE(p.primary_position, 'Player') as position,
           SUM(pss.appearances)::int as appearances,
           SUM(pss.goals)::int as goals,
           SUM(pss.assists)::int as assists,
           SUM(pss.goals + pss.assists)::int as contributions
         FROM player_season_stats pss
         JOIN player p ON pss.player_id = p.player_id
         WHERE pss.team_id = $1
         GROUP BY p.player_id, p.first_name, p.last_name, p.photo_url, p.primary_position
         HAVING SUM(pss.goals + pss.assists) > 0
         ORDER BY contributions DESC, goals DESC
         LIMIT 5`,
        [team1Id]
      ),
      pool.query(
        `SELECT 
           p.player_id as "playerId",
           CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) as name,
           p.photo_url as photo,
           COALESCE(p.primary_position, 'Player') as position,
           SUM(pss.appearances)::int as appearances,
           SUM(pss.goals)::int as goals,
           SUM(pss.assists)::int as assists,
           SUM(pss.goals + pss.assists)::int as contributions
         FROM player_season_stats pss
         JOIN player p ON pss.player_id = p.player_id
         WHERE pss.team_id = $1
         GROUP BY p.player_id, p.first_name, p.last_name, p.photo_url, p.primary_position
         HAVING SUM(pss.goals + pss.assists) > 0
         ORDER BY contributions DESC, goals DESC
         LIMIT 5`,
        [team2Id]
      ),
    ]);

    return NextResponse.json({
      success: true,
      team1: team1Info,
      team2: team2Info,
      h2h: {
        ...h2hSummary,
        recentMatches: recentH2H.rows,
      },
      standings: standingsData,
      topScorers: {
        team1: t1ScorersRes.rows,
        team2: t2ScorersRes.rows,
      },
      suggestedOpponents,
    });
  } catch (error) {
    console.error('Error comparing teams:', error);
    return NextResponse.json(
      { error: 'Failed to generate team comparison', details: error.message },
      { status: 500 }
    );
  }
}
