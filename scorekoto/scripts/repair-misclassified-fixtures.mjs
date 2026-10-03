import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const shouldApply = process.argv.includes("--apply");

if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

const correction = {
  matchId: 1376472,
  expectedHome: "Newcastle",
  expectedAway: "ADO Den Haag",
  expectedCompetition: "Ligue 1",
  correctedHome: "ADO Den Haag",
  correctedAway: "Newcastle",
  competitionId: 667,
  competition: "Friendlies Clubs",
  country: "World",
  type: "Cup",
  logo: "https://media.api-sports.io/football/leagues/667.png",
  season: "2012",
  date: "2012-08-04 17:00:00",
  venue: "Kyocera Stadium",
  status: "FT",
  homeScore: 0,
  awayScore: 0,
};

try {
  const beforeResult = await pool.query(
    `SELECT
       m.match_id,
       m.match_date,
       m.status,
       m.home_score,
       m.away_score,
       m.venue,
       ht.name AS home_team,
       at.name AS away_team,
       l.name AS competition,
       l.country,
       s.year AS season
     FROM match m
     JOIN team ht ON ht.team_id = m.home_team_id
     JOIN team at ON at.team_id = m.away_team_id
     JOIN season s ON s.season_id = m.season_id
     JOIN league l ON l.league_id = s.league_id
     WHERE m.match_id = $1`,
    [correction.matchId]
  );
  const before = beforeResult.rows[0];

  if (!before) throw new Error(`Match ${correction.matchId} was not found`);

  const alreadyCorrected =
    before.home_team === correction.correctedHome &&
    before.away_team === correction.correctedAway &&
    before.competition === correction.competition &&
    String(before.status).toUpperCase() === correction.status;

  if (!alreadyCorrected && (
    before.home_team !== correction.expectedHome ||
    before.away_team !== correction.expectedAway ||
    before.competition !== correction.expectedCompetition ||
    before.match_date !== null
  )) {
    throw new Error(`Match ${correction.matchId} no longer matches the audited corrupt record`);
  }

  if (shouldApply && !alreadyCorrected) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [667]);

      await client.query(
        `INSERT INTO league (league_id, name, country, type, logo_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (league_id) DO UPDATE SET
           name = EXCLUDED.name,
           country = EXCLUDED.country,
           type = EXCLUDED.type,
           logo_url = EXCLUDED.logo_url`,
        [
          correction.competitionId,
          correction.competition,
          correction.country,
          correction.type,
          correction.logo,
        ]
      );

      let seasonResult = await client.query(
        `SELECT season_id
         FROM season
         WHERE league_id = $1 AND year = $2
         LIMIT 1`,
        [correction.competitionId, correction.season]
      );

      if (seasonResult.rows.length === 0) {
        const idResult = await client.query(
          `SELECT COALESCE(MAX(season_id), 0)::int + 1 AS next_id FROM season`
        );
        seasonResult = await client.query(
          `INSERT INTO season (season_id, league_id, year, start_date, end_date)
           VALUES ($1, $2, $3, $4::date, $4::date)
           RETURNING season_id`,
          [
            idResult.rows[0].next_id,
            correction.competitionId,
            correction.season,
            correction.date.slice(0, 10),
          ]
        );
      }

      const teamsResult = await client.query(
        `SELECT team_id, name
         FROM team
         WHERE name = ANY($1::text[])`,
        [[correction.correctedHome, correction.correctedAway]]
      );
      const teamIds = new Map(teamsResult.rows.map((team) => [team.name, team.team_id]));
      if (!teamIds.has(correction.correctedHome) || !teamIds.has(correction.correctedAway)) {
        throw new Error("Could not resolve both corrected fixture teams");
      }

      await client.query(
        `UPDATE match
         SET season_id = $1,
             home_team_id = $2,
             away_team_id = $3,
             match_date = $4::timestamp,
             venue = $5,
             status = $6,
             home_score = $7,
             away_score = $8
         WHERE match_id = $9`,
        [
          seasonResult.rows[0].season_id,
          teamIds.get(correction.correctedHome),
          teamIds.get(correction.correctedAway),
          correction.date,
          correction.venue,
          correction.status,
          correction.homeScore,
          correction.awayScore,
          correction.matchId,
        ]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(JSON.stringify({
    mode: shouldApply ? "apply" : "dry-run",
    alreadyCorrected,
    before,
    correction,
  }, null, 2));
} finally {
  await pool.end();
}
