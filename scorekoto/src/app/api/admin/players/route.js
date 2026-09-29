import { NextResponse } from 'next/server';
import pool, { withTransaction } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to safely cascade-delete duplicate player records without FK constraint violations
async function deleteDuplicatePlayer(clientOrPool, playerId) {
  await clientOrPool.query('DELETE FROM match_event WHERE player_id = $1', [playerId]);
  await clientOrPool.query('DELETE FROM match_lineup WHERE player_id = $1', [playerId]);
  await clientOrPool.query('UPDATE news SET player_id = NULL WHERE player_id = $1', [playerId]);
  await clientOrPool.query('DELETE FROM player_injury WHERE player_id = $1', [playerId]);
  await clientOrPool.query('DELETE FROM player_season_stats WHERE player_id = $1', [playerId]);
  await clientOrPool.query('DELETE FROM team_squad_member WHERE player_id = $1', [playerId]);
  try {
    await clientOrPool.query('DELETE FROM user_favorite_player WHERE player_id = $1', [playerId]);
  } catch {
    // Ignore if table does not exist
  }
  await clientOrPool.query('DELETE FROM player WHERE player_id = $1', [playerId]);
}

// POST: Create a new player in PostgreSQL database
export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      team_id,
      primary_position,
      nationality,
      date_of_birth,
      market_value_euros,
      weight_cm,
      photo_url,
    } = body;

    if (!first_name || !first_name.trim() || !last_name || !last_name.trim()) {
      return NextResponse.json(
        { error: 'Both First Name and Last Name are required.' },
        { status: 400 }
      );
    }

    const cleanFirstName = first_name.trim();
    const cleanLastName = last_name.trim();
    const cleanPosition = primary_position ? primary_position.trim() : null;
    const cleanNationality = nationality ? nationality.trim() : null;
    const cleanDob = date_of_birth ? date_of_birth.trim() : null;
    const cleanMarketValue = market_value_euros ? parseFloat(market_value_euros) : null;
    const cleanWeight = weight_cm ? parseFloat(weight_cm) : null;
    const cleanPhoto = photo_url ? photo_url.trim() : null;

    let validTeamId = null;
    let teamName = null;
    if (team_id) {
      const parsedTeamId = parseInt(team_id, 10);
      if (!isNaN(parsedTeamId)) {
        const teamCheck = await pool.query('SELECT team_id, name FROM team WHERE team_id = $1', [parsedTeamId]);
        if (teamCheck.rows.length > 0) {
          validTeamId = parsedTeamId;
          teamName = teamCheck.rows[0].name;
        }
      }
    }

    // 1. Check if identical player already exists in the database
    const existingCheckQuery = `
      SELECT player_id, first_name, last_name, team_id, primary_position, nationality
      FROM player
      WHERE LOWER(TRIM(first_name)) = LOWER($1)
        AND LOWER(TRIM(last_name)) = LOWER($2)
        AND (($3::INT IS NULL AND team_id IS NULL) OR team_id = $3::INT)
      ORDER BY player_id ASC;
    `;
    const existingRes = await pool.query(existingCheckQuery, [
      cleanFirstName,
      cleanLastName,
      validTeamId,
    ]);

    if (existingRes.rows.length > 0) {
      const primaryPlayer = existingRes.rows[0];
      let removedCount = 0;

      // Handle duplicate: if duplicate records exist, retain the primary and remove redundant copies
      if (existingRes.rows.length > 1) {
        for (let i = 1; i < existingRes.rows.length; i++) {
          await deleteDuplicatePlayer(pool, existingRes.rows[i].player_id);
          removedCount++;
        }
      }

      const teamDescriptor = teamName ? ` in ${teamName}` : '';
      const removalNotice = removedCount > 0 ? ` Cleaned up ${removedCount} duplicate record(s) from database.` : '';

      return NextResponse.json(
        {
          error: `Player already exists: A player named "${cleanFirstName} ${cleanLastName}" already exists${teamDescriptor} (Player ID #${primaryPlayer.player_id}).${removalNotice} Duplicate submission rejected.`,
          existing_player: primaryPlayer,
          duplicates_removed: removedCount,
        },
        { status: 409 }
      );
    }

    const insertQuery = `
      INSERT INTO player (
        first_name,
        last_name,
        team_id,
        primary_position,
        nationality,
        date_of_birth,
        market_value_euros,
        weight_cm,
        photo_url,
        transfer_history
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb)
      RETURNING *;
    `;

    // Explicit transaction control: COMMIT & ROLLBACK
    const createdPlayer = await withTransaction(async (client) => {
      const result = await client.query(insertQuery, [
        cleanFirstName,
        cleanLastName,
        validTeamId,
        cleanPosition,
        cleanNationality,
        cleanDob || null,
        cleanMarketValue,
        cleanWeight,
        cleanPhoto,
      ]);
      return result.rows[0];
    });

    // Fetch team name if assigned and not yet retrieved
    if (createdPlayer.team_id && !teamName) {
      const teamRes = await pool.query('SELECT name FROM team WHERE team_id = $1', [createdPlayer.team_id]);
      if (teamRes.rows.length > 0) {
        teamName = teamRes.rows[0].name;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Player created successfully in database',
        player: {
          ...createdPlayer,
          team_name: teamName,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating player:', err);
    const isDuplicate = err.message && (err.message.includes('Player already exists') || err.code === '23505');
    return NextResponse.json(
      { error: err.message || 'Failed to create player in database' },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}

