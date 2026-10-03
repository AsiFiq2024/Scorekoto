import { NextResponse } from 'next/server';
import pool from '../../lib/db';
import { getUserFromRequest } from '../../lib/auth';

export const dynamic = 'force-dynamic';

function formatRelativeTime(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '8', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 8;

    const favoriteCheck = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM user_favorite_team WHERE user_id = $1)
         OR EXISTS (SELECT 1 FROM user_favorite_league WHERE user_id = $1)
         OR EXISTS (SELECT 1 FROM user_favorite_player WHERE user_id = $1)
         AS has_favorites`,
      [user.user_id]
    );

    if (!favoriteCheck.rows[0].has_favorites) {
      return NextResponse.json({
        success: true,
        count: 0,
        hasFavorites: false,
        notifications: [],
      });
    }

    const query = `
      SELECT 
        m.match_id,
        m.status,
        m.home_score,
        m.away_score,
        m.match_date,
        ht.name as home_team,
        at.name as away_team,
        l.name as league_name,
        favorite_player_event.player_name as favorite_player_name,
        favorite_player_event.event_type as favorite_player_event
      FROM match m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      LEFT JOIN season s ON m.season_id = s.season_id
      LEFT JOIN league l ON s.league_id = l.league_id
      LEFT JOIN LATERAL (
        SELECT
          me.player_id,
          CONCAT_WS(' ', p.first_name, NULLIF(BTRIM(p.last_name), '')) AS player_name,
          me.event_type
        FROM match_event me
        JOIN user_favorite_player ufp ON ufp.player_id = me.player_id
        JOIN player p ON p.player_id = me.player_id
        WHERE me.match_id = m.match_id
          AND ufp.user_id = $1
        ORDER BY me.event_id DESC
        LIMIT 1
      ) favorite_player_event ON TRUE
      WHERE EXISTS (
          SELECT 1
          FROM user_favorite_team uft
          WHERE uft.user_id = $1
            AND uft.team_id IN (m.home_team_id, m.away_team_id)
        )
        OR EXISTS (
          SELECT 1
          FROM user_favorite_league ufl
          WHERE ufl.user_id = $1
            AND ufl.league_id = s.league_id
        )
        OR favorite_player_event.player_id IS NOT NULL
      ORDER BY m.match_date DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [user.user_id, limit]);

    const notifications = result.rows.map((row, index) => {
      const isLive = row.status === 'LIVE' || row.status === '1H' || row.status === '2H' || row.status === 'HT';
      const isFinished = row.status === 'FT' || row.status === 'AET' || row.status === 'PEN';
      const isUpcoming = row.status === 'NS' || row.status === 'TBD' || row.status === 'UPCOMING';

      let type = 'result';
      let title = 'Match Update';
      let message = `${row.home_team} vs ${row.away_team}`;

      if (row.favorite_player_name) {
        const eventLabel = String(row.favorite_player_event || 'Match event')
          .replaceAll('_', ' ')
          .toLowerCase();
        type = eventLabel.includes('goal') ? 'goal' : 'result';
        title = 'Favorite player update';
        message = `${row.favorite_player_name}: ${eventLabel} in ${row.home_team} vs ${row.away_team}.`;
      } else if (isLive) {
        type = 'live';
        title = 'Match is Live';
        message = `${row.home_team} ${row.home_score ?? 0} - ${row.away_score ?? 0} ${row.away_team} is underway.`;
      } else if (isFinished) {
        type = 'result';
        title = 'Full Time';
        message = `${row.home_team} ${row.home_score ?? 0} - ${row.away_score ?? 0} ${row.away_team} (${row.league_name || 'Match'})`;
      } else if (isUpcoming) {
        type = 'upcoming';
        title = 'Match Scheduled';
        message = `${row.home_team} vs ${row.away_team} in ${row.league_name || 'League'}.`;
      }

      return {
        id: row.match_id || index + 1,
        type,
        title,
        message,
        matchId: row.match_id,
        time: formatRelativeTime(row.match_date),
        read: index > 1, // First two unread as fresh highlights
      };
    });

    return NextResponse.json({
      success: true,
      count: notifications.length,
      hasFavorites: true,
      notifications,
    });
  } catch (err) {
    console.error('Failed to fetch notifications from database:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: err.message },
      { status: 500 }
    );
  }
}

