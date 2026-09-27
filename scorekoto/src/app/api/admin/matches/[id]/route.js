import { NextResponse } from 'next/server';
import pool, { withTransaction } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/auth';

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
    const matchId = Number(id);

    if (!matchId || isNaN(matchId)) {
      return NextResponse.json(
        { error: 'Invalid match ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      home_score,
      away_score,
      status,
      venue,
      match_date,
      home_possession,
      away_possession,
    } = body;

    const updateQuery = `
      UPDATE match
      SET 
        home_score = COALESCE($1, home_score),
        away_score = COALESCE($2, away_score),
        status = COALESCE($3, status),
        venue = COALESCE($4, venue),
        match_date = COALESCE($5, match_date),
        home_possession = COALESCE($6, home_possession),
        away_possession = COALESCE($7, away_possession)
      WHERE match_id = $8
      RETURNING *;
    `;

    // Explicit transaction control: COMMIT & ROLLBACK
    const updatedMatch = await withTransaction(async (client) => {
      const result = await client.query(updateQuery, [
        home_score !== undefined ? parseInt(home_score, 10) : null,
        away_score !== undefined ? parseInt(away_score, 10) : null,
        status || null,
        venue || null,
        match_date || null,
        home_possession !== undefined ? parseFloat(home_possession) : null,
        away_possession !== undefined ? parseFloat(away_possession) : null,
        matchId,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Match not found in database');
      }

      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: 'Match attributes updated successfully in database',
      match: updatedMatch,
    });
  } catch (err) {
    console.error('Error updating match:', err);
    const status = err.message === 'Match not found in database' ? 404 : 500;
    return NextResponse.json(
      { error: err.message || 'Failed to update match attributes' },
      { status }
    );
  }
}

// DELETE: Cascaded deletion of a match using PL/pgSQL Stored Procedure (sp_delete_match_cascade)
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
    const matchId = Number(id);

    if (!matchId || isNaN(matchId)) {
      return NextResponse.json(
        { error: 'Invalid match ID' },
        { status: 400 }
      );
    }

    // Explicit transaction control invoking Stored Procedure sp_delete_match_cascade
    await withTransaction(async (client) => {
      await client.query('CALL sp_delete_match_cascade($1)', [matchId]);
    });

    return NextResponse.json({
      success: true,
      message: `Match #${matchId} and all associated records permanently deleted from PostgreSQL database via stored procedure.`,
    });
  } catch (err) {
    console.error('Error deleting match:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete match from database' },
      { status: 500 }
    );
  }
}
