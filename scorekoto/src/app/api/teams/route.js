import { NextResponse } from 'next/server';
import pool from '../../lib/db';

// Retrieves all teams from the database with search and limit support
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '1000', 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 1000)
      : 1000;

    let query = `
      SELECT 
        team_id, 
        name, 
        short_name, 
        stadium_name, 
        logo_url, 
        history, 
        manager_name,
        LOWER(REPLACE(name, ' ', '-')) as slug
      FROM team
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` WHERE LOWER(name) LIKE $1 OR LOWER(short_name) LIKE $1`;
      params.push(`%${search.trim().toLowerCase()}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      total_teams_found: result.rowCount,
      teams: result.rows,
      teams_data: result.rows,
    });
  } catch (err) {
    console.error('Database read failed:', err);
    return NextResponse.json(
      { error: 'Failed to read teams from database' },
      { status: 500 }
    );
  }
}
