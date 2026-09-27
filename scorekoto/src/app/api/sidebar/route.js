import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { getUserFromRequest } from "@/app/lib/auth";

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    const favoriteQueries = user
      ? [
          pool.query(
            `SELECT
               t.team_id,
               t.name,
               t.short_name,
               t.logo_url,
               LOWER(REPLACE(t.name, ' ', '-')) AS slug
             FROM user_favorite_team uft
             JOIN team t ON t.team_id = uft.team_id
             WHERE uft.user_id = $1
             ORDER BY t.name ASC`,
            [user.user_id]
          ),
          pool.query(
            `SELECT
               l.league_id,
               l.name,
               l.country,
               l.logo_url,
               LOWER(REPLACE(l.name, ' ', '-')) AS slug
             FROM user_favorite_league ufl
             JOIN league l ON l.league_id = ufl.league_id
             WHERE ufl.user_id = $1
             ORDER BY l.name ASC`,
            [user.user_id]
          ),
          pool.query(
            `SELECT
               p.player_id,
               CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS name,
               p.photo_url,
               LOWER(REPLACE(CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')), ' ', '-')) AS slug
             FROM user_favorite_player ufp
             JOIN player p ON p.player_id = ufp.player_id
             WHERE ufp.user_id = $1
             ORDER BY p.last_name ASC, p.first_name ASC`,
            [user.user_id]
          ),
        ]
      : [Promise.resolve({ rows: [] }), Promise.resolve({ rows: [] }), Promise.resolve({ rows: [] })];

    const [favoriteTeams, favoriteLeagues, favoritePlayers] =
      await Promise.all(favoriteQueries);

    return NextResponse.json({
      success: true,
      topTeams: [],
      topLeagues: [],
      favorites: {
        teams: favoriteTeams.rows,
        leagues: favoriteLeagues.rows,
        players: favoritePlayers.rows,
      },
    });
  } catch (error) {
    console.error("Failed to load sidebar navigation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sidebar navigation",
        topTeams: [],
        topLeagues: [],
        favorites: { teams: [], leagues: [], players: [] },
      },
      { status: 500 }
    );
  }
}
