import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

try {
  const [nullDatedMatches, crossCountryTeams, pageCoverage, missingPositions, duplicateTeams] = await Promise.all([
    pool.query(`
      SELECT
        m.match_id,
        m.match_date,
        m.status,
        m.home_score,
        m.away_score,
        ht.name AS home_team,
        at.name AS away_team,
        l.league_id,
        l.name AS competition,
        l.country,
        s.year AS season,
        (SELECT COUNT(*)::int FROM match_event me WHERE me.match_id = m.match_id) AS event_count,
        (SELECT COUNT(*)::int FROM match_lineup ml WHERE ml.match_id = m.match_id) AS lineup_count,
        (SELECT COUNT(*)::int FROM match_comment mc WHERE mc.match_id = m.match_id) AS comment_count
      FROM match m
      JOIN team ht ON ht.team_id = m.home_team_id
      JOIN team at ON at.team_id = m.away_team_id
      JOIN season s ON s.season_id = m.season_id
      JOIN league l ON l.league_id = s.league_id
      WHERE m.match_date IS NULL
      ORDER BY m.match_id
    `),
    pool.query(`
      WITH domestic_evidence AS (
        SELECT
          t.team_id,
          t.name AS team,
          l.country,
          l.name AS competition,
          COUNT(*)::int AS match_count,
          MAX(m.match_date) AS latest_match
        FROM team t
        JOIN match m ON t.team_id IN (m.home_team_id, m.away_team_id)
        JOIN season s ON s.season_id = m.season_id
        JOIN league l ON l.league_id = s.league_id
        WHERE LOWER(COALESCE(l.country, 'world')) <> 'world'
          AND m.match_date IS NOT NULL
        GROUP BY t.team_id, t.name, l.country, l.name
      ), ambiguous AS (
        SELECT team_id
        FROM domestic_evidence
        GROUP BY team_id
        HAVING COUNT(DISTINCT LOWER(country)) > 1
      )
      SELECT de.*
      FROM domestic_evidence de
      JOIN ambiguous a ON a.team_id = de.team_id
      ORDER BY de.team, de.latest_match DESC NULLS LAST, de.match_count DESC
    `),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM league) AS leagues,
        (SELECT COUNT(*)::int FROM league WHERE NULLIF(BTRIM(country), '') IS NULL OR NULLIF(BTRIM(type), '') IS NULL OR NULLIF(BTRIM(logo_url), '') IS NULL) AS incomplete_leagues,
        (SELECT COUNT(*)::int FROM team) AS teams,
        (SELECT COUNT(*)::int FROM team WHERE NULLIF(BTRIM(stadium_name), '') IS NULL) AS teams_missing_stadium,
        (SELECT COUNT(*)::int FROM team WHERE NULLIF(BTRIM(manager_name), '') IS NULL) AS teams_missing_manager,
        (SELECT COUNT(*)::int FROM team WHERE NULLIF(BTRIM(history), '') IS NULL) AS teams_missing_history,
        (SELECT COUNT(*)::int FROM player) AS players,
        (SELECT COUNT(*)::int FROM player WHERE NULLIF(BTRIM(photo_url), '') IS NULL) AS players_missing_photo,
        (SELECT COUNT(*)::int FROM player WHERE NULLIF(BTRIM(nationality), '') IS NULL OR LOWER(BTRIM(nationality)) = 'international') AS players_missing_nationality,
        (SELECT COUNT(*)::int FROM player WHERE date_of_birth IS NULL) AS players_missing_birth_date,
        (SELECT COUNT(*)::int FROM player WHERE NULLIF(BTRIM(primary_position), '') IS NULL) AS players_missing_position
    `),
    pool.query(`
      SELECT
        p.player_id,
        CONCAT_WS(' ', p.first_name, p.last_name) AS name,
        t.name AS team,
        p.photo_url,
        (SELECT COUNT(*)::int FROM player_season_stats pss WHERE pss.player_id = p.player_id) AS stat_count,
        (SELECT COUNT(*)::int FROM match_lineup ml WHERE ml.player_id = p.player_id) AS lineup_count,
        (SELECT COUNT(*)::int FROM match_event me WHERE me.player_id = p.player_id) AS event_count,
        (SELECT COUNT(*)::int FROM player_injury pi WHERE pi.player_id = p.player_id) AS injury_count,
        (SELECT COUNT(*)::int FROM user_favorite_player ufp WHERE ufp.player_id = p.player_id) AS favorite_count,
        (SELECT COUNT(*)::int FROM team_squad_member tsm WHERE tsm.player_id = p.player_id) AS squad_count,
        (SELECT COUNT(*)::int FROM news n WHERE n.player_id = p.player_id) AS news_count
      FROM player p
      LEFT JOIN team t ON t.team_id = p.team_id
      WHERE NULLIF(BTRIM(p.primary_position), '') IS NULL
      ORDER BY p.player_id
    `),
    pool.query(`
      WITH duplicates AS (
        SELECT LOWER(BTRIM(name)) AS normalized_name
        FROM team
        GROUP BY LOWER(BTRIM(name))
        HAVING COUNT(*) > 1
      )
      SELECT
        t.team_id,
        t.name,
        t.short_name,
        t.stadium_name,
        t.manager_name,
        t.logo_url,
        (SELECT COUNT(*)::int FROM match m WHERE m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AS match_count,
        (SELECT COUNT(*)::int FROM player p WHERE p.team_id = t.team_id) AS player_count,
        (SELECT COUNT(*)::int FROM player_season_stats pss WHERE pss.team_id = t.team_id) AS player_stat_team_count,
        (SELECT COUNT(*)::int FROM team_season_stats tss WHERE tss.team_id = t.team_id) AS stat_count,
        (SELECT COUNT(*)::int FROM team_squad_member tsm WHERE tsm.team_id = t.team_id) AS squad_count,
        (SELECT COUNT(*)::int FROM team_squad_sync tss WHERE tss.team_id = t.team_id) AS squad_sync_count,
        (SELECT COUNT(*)::int FROM user_favorite_team uft WHERE uft.team_id = t.team_id) AS favorite_count,
        (SELECT COUNT(*)::int FROM team_trophy tt WHERE tt.team_id = t.team_id) AS trophy_count,
        (SELECT COUNT(*)::int FROM news n WHERE n.team_id = t.team_id) AS news_count,
        (SELECT COUNT(*)::int FROM processed_teams_players ptp WHERE ptp.team_id = t.team_id) AS processed_count
      FROM team t
      JOIN duplicates d ON d.normalized_name = LOWER(BTRIM(t.name))
      ORDER BY t.name, t.team_id
    `),
  ]);

  console.log(JSON.stringify({
    pageCoverage: pageCoverage.rows[0],
    nullDatedMatches: nullDatedMatches.rows,
    crossCountryTeams: crossCountryTeams.rows,
    missingPositions: missingPositions.rows,
    duplicateTeams: duplicateTeams.rows,
  }, null, 2));
} finally {
  await pool.end();
}
