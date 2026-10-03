// Centralized API-Sports key manager and resilient multi-key failover client

export function getApiSportsKeys() {
  const multi = process.env.API_SPORTS_KEYS || '';
  const single = process.env.API_SPORTS_KEY || '';
  const combined = `${multi},${single}`;

  return Array.from(
    new Set(
      combined
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    )
  );
}

export function getPrimaryApiSportsKey() {
  const keys = getApiSportsKeys();
  return keys[0] || '';
}

// Resilient API-Sports fetcher that rotates through all configured keys
// when rate limits or daily quotas are reached on a key.
export async function fetchFromApiSports(endpointOrUrl, options = {}) {
  const keys = getApiSportsKeys();
  if (keys.length === 0) {
    return { data: null, error: 'No API-Sports key configured', quotaReached: false };
  }

  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `https://v3.football.api-sports.io/${endpointOrUrl.replace(/^\//, '')}`;

  let lastError = null;
  let allQuotasExhausted = false;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
        'x-apisports-key': key,
      };

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();

      if (data.errors && Object.keys(data.errors).length > 0) {
        const errMsg = Object.values(data.errors).join(', ');
        lastError = errMsg;
        // If quota or rate limit error, rotate to the next key
        console.warn(`API-Sports quota notice with key [${key.slice(0, 8)}...]: ${errMsg}. Rotating to next key.`);
        continue;
      }

      // Success with current key
      return { data, error: null, quotaReached: false, usedKeyIndex: i };
    } catch (err) {
      lastError = err.message;
    }
  }

  allQuotasExhausted = true;
  return {
    data: null,
    error: lastError || 'All configured API keys exhausted or unavailable',
    quotaReached: allQuotasExhausted,
  };
}
