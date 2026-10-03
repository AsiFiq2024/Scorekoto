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

// In-memory pointer to the currently healthy/active key to avoid wasteful retries
let currentWorkingKeyIndex = 0;

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
  const startingIndex = currentWorkingKeyIndex;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (startingIndex + attempt) % keys.length;
    const key = keys[keyIndex];

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
        if (res.status === 429 || res.status === 403) {
          console.warn(`API-Sports key [${key.slice(0, 8)}...] returned HTTP ${res.status}. Rotating to next key.`);
          currentWorkingKeyIndex = (keyIndex + 1) % keys.length;
        }
        continue;
      }

      const data = await res.json();

      if (data.errors && Object.keys(data.errors).length > 0) {
        const errMsg = Object.values(data.errors).join(', ');
        lastError = errMsg;
        const errLower = errMsg.toLowerCase();
        console.warn(`API-Sports notice with key [${key.slice(0, 8)}...]: ${errMsg}. Rotating to next key.`);
        if (
          errLower.includes('limit') ||
          errLower.includes('quota') ||
          errLower.includes('reach') ||
          errLower.includes('suspended') ||
          errLower.includes('token')
        ) {
          currentWorkingKeyIndex = (keyIndex + 1) % keys.length;
        }
        continue;
      }

      // Success with current key - lock in this key as active
      currentWorkingKeyIndex = keyIndex;
      return { data, error: null, quotaReached: false, usedKeyIndex: keyIndex };
    } catch (err) {
      lastError = err.message;
    }
  }

  return {
    data: null,
    error: lastError || 'All configured API keys exhausted or unavailable',
    quotaReached: true,
  };
}
