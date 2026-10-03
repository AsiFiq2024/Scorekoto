import "server-only";

import pool from "@/app/lib/db";

/**
 * Resolve a team's competitions from dated fixtures and stored standings.
 *
 * Undated fixtures are deliberately excluded: an incomplete or wrongly
 * imported historical fixture must never replace a team's real competition.
 * Domestic leagues are preferred for the primary affiliation, while cups and
 * international competitions remain available in the complete list.
 */
export async function getTeamCompetitions(teamId, queryable = pool) {
  if (!Number.isInteger(Number(teamId)) || Number(teamId) <= 0) return [];

  const { rows } = await queryable.query(
    `WITH competition_evidence AS (
       SELECT
         l.league_id,
         l.name,
         l.country,
         l.type,
         MAX(m.match_date) AS latest_activity,
         COUNT(*)::int AS evidence_count
       FROM match m
       JOIN season s ON s.season_id = m.season_id
       JOIN league l ON l.league_id = s.league_id
       WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
         AND m.match_date IS NOT NULL
       GROUP BY l.league_id, l.name, l.country, l.type

       UNION ALL

       SELECT
         l.league_id,
         l.name,
         l.country,
         l.type,
         MAX(COALESCE(s.end_date, s.start_date)) AS latest_activity,
         COUNT(*)::int AS evidence_count
       FROM team_season_stats tss
       JOIN season s ON s.season_id = tss.season_id
       JOIN league l ON l.league_id = s.league_id
       WHERE tss.team_id = $1
       GROUP BY l.league_id, l.name, l.country, l.type
     )
     SELECT
       league_id AS id,
       name,
       country,
       type,
       MAX(latest_activity) AS latest_match,
       SUM(evidence_count)::int AS match_count
     FROM competition_evidence
     GROUP BY league_id, name, country, type
     ORDER BY
       CASE
         WHEN LOWER(COALESCE(type, '')) = 'league'
           AND LOWER(COALESCE(country, 'world')) <> 'world' THEN 0
         WHEN LOWER(COALESCE(country, 'world')) <> 'world' THEN 1
         ELSE 2
       END,
       MAX(latest_activity) DESC NULLS LAST,
       SUM(evidence_count) DESC,
       name ASC`,
    [Number(teamId)]
  );

  return rows;
}

export async function getTeamPrimaryCompetition(teamId, queryable = pool) {
  const competitions = await getTeamCompetitions(teamId, queryable);
  return competitions[0] || null;
}
