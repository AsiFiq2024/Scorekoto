import { NextResponse } from 'next/server';
import pool from '../../lib/db';

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

// Per-topic rate limiting & caching (15 minutes per topic)
const topicFetchTimes = new Map();
const NEWS_FETCH_INTERVAL = 15 * 60 * 1000;

const NON_SOCCER_KEYWORDS = [
  'nfl', 'touchdown', 'quarterback', 'anime', 'manga', 'baseball',
  'mlb', 'nba', 'hockey', 'nhl', 'referendum', 'election', 'cricket', 'rugby'
];

function isAuthenticFootballStory(article) {
  const text = `${article.title || ''} ${article.description || ''} ${article.source?.name || ''}`.toLowerCase();
  if (NON_SOCCER_KEYWORDS.some((bad) => text.includes(bad))) return false;
  return true;
}

function getSearchQueryForTopic(topic) {
  const lower = (topic || '').trim().toLowerCase();
  if (!lower || lower === 'all') {
    return '("Premier League" OR "Champions League" OR "La Liga" OR "Serie A" OR "Bundesliga" OR "Europa League") AND (football OR soccer)';
  }
  if (lower === 'la liga' || lower === 'laliga' || lower === 'la-liga') {
    return '("La Liga" OR "Real Madrid" OR "FC Barcelona" OR "Atletico Madrid" OR "Lamine Yamal" OR "Vinicius") AND (football OR soccer)';
  }
  if (lower.includes('premier league') || lower === 'epl') {
    return '("Premier League" OR "Manchester City" OR "Arsenal" OR "Liverpool" OR "Manchester United" OR "Chelsea") AND (football OR soccer)';
  }
  if (lower.includes('champions league') || lower === 'ucl') {
    return '("Champions League" OR "UEFA Champions League" OR "UCL") AND (football OR soccer)';
  }
  if (lower.includes('serie a')) {
    return '("Serie A" OR "Juventus" OR "Inter Milan" OR "AC Milan" OR "Napoli") AND (football OR soccer)';
  }
  if (lower.includes('bundesliga')) {
    return '("Bundesliga" OR "Bayern Munich" OR "Borussia Dortmund" OR "Bayer Leverkusen") AND (football OR soccer)';
  }
  if (lower.includes('transfer')) {
    return '("transfer window" OR "Fabrizio Romano" OR "transfer fee" OR "contract extension" OR "transfer news") AND (football OR soccer)';
  }
  // Dynamic fallback for any team or league name! (e.g. "Arsenal", "Barcelona", "World Cup")
  return `("${topic}") AND (football OR soccer)`;
}

async function syncFreshNewsFromApi(topic = 'all') {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return;

  const topicKey = (topic || 'all').toLowerCase();

  try {
    const q = getSearchQueryForTopic(topic);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=25&apiKey=${apiKey}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.warn(`NewsAPI returned HTTP ${res.status} for topic ${topic}`);
      return;
    }

    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      return;
    }

    // Determine canonical category label for storage
    let canonicalCategory = 'Football News';
    if (topicKey !== 'all') {
      if (topicKey.includes('la liga') || topicKey.includes('laliga')) canonicalCategory = 'La Liga';
      else if (topicKey.includes('premier league')) canonicalCategory = 'Premier League';
      else if (topicKey.includes('champions league')) canonicalCategory = 'Champions League';
      else if (topicKey.includes('serie a')) canonicalCategory = 'Serie A';
      else if (topicKey.includes('bundesliga')) canonicalCategory = 'Bundesliga';
      else if (topicKey.includes('transfer')) canonicalCategory = 'Transfers';
      else canonicalCategory = topic.slice(0, 45);
    }

    for (const a of data.articles) {
      if (!a.title || a.title === '[Removed]') continue;
      if (!isAuthenticFootballStory(a)) continue;

      const headline = a.title.trim().slice(0, 195);
      const content = (a.description || a.content || 'Read the full story online.').trim();
      const categoryToStore = canonicalCategory !== 'Football News'
        ? canonicalCategory
        : ((a.source?.name || 'Football News').trim().slice(0, 48));
      const publishedAt = a.publishedAt ? new Date(a.publishedAt) : new Date();
      const articleUrl = a.url || null;
      const imageUrl = a.urlToImage || null;

      // Check if duplicate already exists by headline or URL
      const check = await pool.query(
        'SELECT 1 FROM news WHERE headline = $1 OR (url IS NOT NULL AND url = $2) LIMIT 1',
        [headline, articleUrl]
      );

      if (check.rows.length === 0) {
        await pool.query(
          `INSERT INTO news (category, headline, content, published_at, url, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [categoryToStore, headline, content, publishedAt, articleUrl, imageUrl]
        );
      }
    }

    topicFetchTimes.set(topicKey, Date.now());
  } catch (err) {
    console.warn(`Background NewsAPI fetch notice for ${topic}:`, err.message);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '8', 10), 1), 100);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const search = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || '').trim();

    const topic = category && category.toLowerCase() !== 'all' ? category : (search || 'all');
    const topicKey = topic.toLowerCase();

    // Check how many articles we currently have for this topic in Supabase
    let existingCount = 0;
    try {
      if (topicKey === 'all') {
        const countRes = await pool.query('SELECT count(*) FROM news');
        existingCount = parseInt(countRes.rows[0].count, 10);
      } else {
        const countRes = await pool.query(
          `SELECT count(*) FROM news 
           WHERE LOWER(COALESCE(category, '')) LIKE $1 
              OR LOWER(headline) LIKE $1 
              OR LOWER(COALESCE(content, '')) LIKE $1`,
          [`%${topicKey}%`]
        );
        existingCount = parseInt(countRes.rows[0].count, 10);
      }
    } catch (cErr) {
      // Fallback
    }

    const lastFetch = topicFetchTimes.get(topicKey) || 0;
    const isStale = (Date.now() - lastFetch) > NEWS_FETCH_INTERVAL;
    const shouldFetchApi = forceRefresh || isStale || existingCount < 5;

    // Fetch from NewsAPI on demand and store in Supabase
    if (shouldFetchApi) {
      await syncFreshNewsFromApi(topic);
    }

    const whereConditions = [];
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search.toLowerCase()}%`);
      whereConditions.push(`(LOWER(n.headline) LIKE $${queryParams.length} OR LOWER(COALESCE(n.content, '')) LIKE $${queryParams.length} OR LOWER(COALESCE(n.category, '')) LIKE $${queryParams.length})`);
    }

    if (category && category.toLowerCase() !== 'all') {
      queryParams.push(`%${category.toLowerCase()}%`);
      whereConditions.push(`(LOWER(COALESCE(n.category, '')) LIKE $${queryParams.length} OR LOWER(n.headline) LIKE $${queryParams.length} OR LOWER(COALESCE(n.content, '')) LIKE $${queryParams.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    queryParams.push(limit);

    const query = `
      SELECT 
        n.news_id as id,
        n.headline as title,
        n.category,
        n.content as description,
        n.published_at,
        n.url,
        n.image_url,
        t.name as team_name,
        t.logo_url as team_logo
      FROM news n
      LEFT JOIN team t ON n.team_id = t.team_id
      ${whereClause}
      ORDER BY n.published_at DESC, n.news_id DESC
      LIMIT $${queryParams.length};
    `;

    let result = await pool.query(query, queryParams);

    // If still 0 articles (e.g. edge case), try topic API sync once
    if (result.rows.length === 0 && !shouldFetchApi) {
      await syncFreshNewsFromApi(topic);
      result = await pool.query(query, queryParams);
    }

    const newsItems = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category || 'Football News',
      description: row.description,
      time: formatRelativeTime(row.published_at),
      publishedAt: row.published_at,
      url: row.url || null,
      image: row.image_url || row.team_logo || null,
      teamName: row.team_name,
      teamLogo: row.team_logo,
    }));

    return NextResponse.json({
      success: true,
      count: newsItems.length,
      news: newsItems,
    });
  } catch (err) {
    console.error('Failed to fetch news from database:', err);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: err.message },
      { status: 500 }
    );
  }
}
