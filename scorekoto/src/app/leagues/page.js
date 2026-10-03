import pool from "@/app/lib/db";
import LeagueDirectory from "./LeagueDirectory";

export const dynamic = "force-dynamic";

async function getLeagues() {
  try {
    const res = await pool.query(`
      SELECT
        league_id as id,
        name,
        country,
        type,
        logo_url,
        LOWER(REPLACE(name, ' ', '-')) as slug
      FROM league
      ORDER BY name ASC
    `);

    if (res.rows.length > 0) return res.rows;
  } catch (err) {
    console.error("Error fetching leagues from DB:", err);
  }
  return [];
}

export default async function LeaguesPage() {
  const leagues = await getLeagues();
  const countryCount = new Set(leagues.map((league) => league.country).filter(Boolean)).size;

  return <LeagueDirectory leagues={leagues} countryCount={countryCount} />;
}
