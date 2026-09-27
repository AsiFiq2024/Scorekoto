import { NextResponse } from 'next/server';
import pool, { withTransaction } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/auth';

// PUT: Update player attributes in database
export async function PUT(request, { params }) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const playerId = Number(id);

    if (!playerId || isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      primary_position,
      nationality,
      date_of_birth,
      market_value_euros,
      weight_cm,
      photo_url,
      team_id,
    } = body;

    const updateQuery = `
      UPDATE player
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        primary_position = COALESCE($3, primary_position),
        nationality = COALESCE($4, nationality),
        date_of_birth = COALESCE($5, date_of_birth),
        market_value_euros = COALESCE($6, market_value_euros),
        weight_cm = COALESCE($7, weight_cm),
        photo_url = COALESCE($8, photo_url),
        team_id = COALESCE($9, team_id)
      WHERE player_id = $10
      RETURNING *;
    `;

    // Explicit transaction control: COMMIT & ROLLBACK
    const updatedPlayer = await withTransaction(async (client) => {
      // 1. Check existing player and current team
      const existingRes = await client.query('SELECT team_id, market_value_euros FROM player WHERE player_id = $1', [playerId]);
      if (existingRes.rows.length === 0) {
        throw new Error('Player not found in database');
      }

      const currentTeamId = existingRes.rows[0].team_id;
      const newTeamId = team_id !== undefined ? parseInt(team_id, 10) : null;
      const targetMarketValue = market_value_euros !== undefined ? parseFloat(market_value_euros) : existingRes.rows[0].market_value_euros;

      // If team is being transferred to a different club, invoke PL/pgSQL Stored Procedure
      if (newTeamId && !isNaN(newTeamId) && newTeamId !== currentTeamId) {
        await client.query('CALL sp_transfer_player($1, $2, $3)', [
          playerId,
          newTeamId,
          targetMarketValue,
        ]);
      }

      // 2. Update remaining player attributes
      const result = await client.query(updateQuery, [
        first_name || null,
        last_name || null,
        primary_position || null,
        nationality || null,
        date_of_birth || null,
        market_value_euros !== undefined ? parseFloat(market_value_euros) : null,
        weight_cm !== undefined ? parseFloat(weight_cm) : null,
        photo_url || null,
        newTeamId !== null && !isNaN(newTeamId) ? newTeamId : null,
        playerId,
      ]);

      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: 'Player attributes updated successfully in database',
      player: updatedPlayer,
    });
  } catch (err) {
    console.error('Error updating player:', err);
    return NextResponse.json(
      { error: 'Failed to update player attributes' },
      { status: 500 }
    );
  }
}

// DELETE: Remove player and cleanly cascade/disassociate related records
export async function DELETE(request, { params }) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const playerId = Number(id);

    if (!playerId || isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Disassociate from match events
      await client.query('DELETE FROM match_event WHERE player_id = $1', [playerId]);

      // 2. Disassociate from match lineups
      await client.query('DELETE FROM match_lineup WHERE player_id = $1', [playerId]);

      // 3. Disassociate news referencing this player
      await client.query('UPDATE news SET player_id = NULL WHERE player_id = $1', [playerId]);

      // 4. Delete player injuries
      await client.query('DELETE FROM player_injury WHERE player_id = $1', [playerId]);

      // 5. Delete player season statistics
      await client.query('DELETE FROM player_season_stats WHERE player_id = $1', [playerId]);

      // 6. Delete team squad member link
      await client.query('DELETE FROM team_squad_member WHERE player_id = $1', [playerId]);

      // 7. Delete user favorite player entries
      await client.query('DELETE FROM user_favorite_player WHERE player_id = $1', [playerId]);

      // 8. Delete player
      const deleteResult = await client.query(
        'DELETE FROM player WHERE player_id = $1 RETURNING player_id, first_name, last_name',
        [playerId]
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Player not found in database' },
          { status: 404 }
        );
      }

      const p = deleteResult.rows[0];
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Player "${p.first_name} ${p.last_name}" (#${playerId}) successfully deleted from database.`,
        deleted_id: playerId,
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting player:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete player' },
      { status: 500 }
    );
  }
}

