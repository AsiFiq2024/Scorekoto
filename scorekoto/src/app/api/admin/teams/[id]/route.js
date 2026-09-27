import { NextResponse } from 'next/server';
import pool, { withTransaction } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/auth';

// PUT: Update team attributes in database
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
    const teamId = Number(id);

    if (!teamId || isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      short_name,
      stadium_name,
      manager_name,
      history,
      logo_url,
    } = body;

    const updateQuery = `
      UPDATE team
      SET 
        name = COALESCE($1, name),
        short_name = COALESCE($2, short_name),
        stadium_name = COALESCE($3, stadium_name),
        manager_name = COALESCE($4, manager_name),
        history = COALESCE($5, history),
        logo_url = COALESCE($6, logo_url)
      WHERE team_id = $7
      RETURNING *;
    `;

    // Explicit transaction control: COMMIT & ROLLBACK
    const updatedTeam = await withTransaction(async (client) => {
      const result = await client.query(updateQuery, [
        name || null,
        short_name || null,
        stadium_name || null,
        manager_name || null,
        history || null,
        logo_url || null,
        teamId,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Team not found in database');
      }

      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: 'Team attributes updated successfully in database',
      team: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating team:', err);
    return NextResponse.json(
      { error: 'Failed to update team attributes' },
      { status: 500 }
    );
  }
}

// DELETE: Remove team and cleanly cascade/disassociate related records
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
    const teamId = Number(id);

    if (!teamId || isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Remove from user favorites
      await client.query('DELETE FROM user_favorite_team WHERE team_id = $1', [teamId]);

      // 2. Remove team trophies
      await client.query('DELETE FROM team_trophy WHERE team_id = $1', [teamId]);

      // 3. Remove team season stats
      await client.query('DELETE FROM team_season_stats WHERE team_id = $1', [teamId]);

      // 4. Disassociate player season stats
      await client.query('UPDATE player_season_stats SET team_id = NULL WHERE team_id = $1', [teamId]);

      // 5. Remove team squad sync & members
      await client.query('DELETE FROM team_squad_sync WHERE team_id = $1', [teamId]);
      await client.query('DELETE FROM team_squad_member WHERE team_id = $1', [teamId]);

      // 6. Disassociate players belonging to this team
      await client.query('UPDATE player SET team_id = NULL WHERE team_id = $1', [teamId]);

      // 7. Disassociate news referencing this team
      await client.query('UPDATE news SET team_id = NULL WHERE team_id = $1', [teamId]);

      // 8. Find and clean up matches involving this team
      const matchesRes = await client.query(
        'SELECT match_id FROM match WHERE home_team_id = $1 OR away_team_id = $1',
        [teamId]
      );
      const matchIds = matchesRes.rows.map((r) => r.match_id);

      if (matchIds.length > 0) {
        await client.query('DELETE FROM match_comment WHERE match_id = ANY($1::int[])', [matchIds]);
        await client.query('DELETE FROM match_event WHERE match_id = ANY($1::int[])', [matchIds]);
        await client.query('DELETE FROM match_lineup WHERE match_id = ANY($1::int[])', [matchIds]);
        await client.query('DELETE FROM match_detail_data WHERE match_id = ANY($1::int[])', [matchIds]);
        await client.query('DELETE FROM match WHERE match_id = ANY($1::int[])', [matchIds]);
      }

      // Also clean any lineups explicitly tagged with team_id
      await client.query('DELETE FROM match_lineup WHERE team_id = $1', [teamId]);

      // Clean processed_teams_players if exists
      try {
        await client.query('DELETE FROM processed_teams_players WHERE team_id = $1', [teamId]);
      } catch {
        // Ignored if table does not exist
      }

      // Delete the team itself
      const deleteResult = await client.query(
        'DELETE FROM team WHERE team_id = $1 RETURNING team_id, name',
        [teamId]
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Team not found in database' },
          { status: 404 }
        );
      }

      const deletedTeam = deleteResult.rows[0];
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Team "${deletedTeam.name}" (#${teamId}) successfully deleted from database.`,
        deleted_id: teamId,
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting team:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}

