const cache = new Map();

const LONG_ISLAND_RECT = "-73.80,40.50,-71.75,41.35";
const CACHE_MAX = 500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", status === 200 ? "s-maxage=86400, stale-while-revalidate=604800" : "no-store");
  res.end(JSON.stringify(body));
}

function normalizeQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.savedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, savedAt: Date.now() });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Method not allowed" });
  }

  const key = process.env.GEOAPIFY_KEY;
  if (!key) return send(res, 500, { error: "Missing GEOAPIFY_KEY" });

  const q = normalizeQuery(req.query && req.query.q);
  if (q.length < 3) return send(res, 400, { error: "Enter a longer address" });
  if (q.length > 160) return send(res, 400, { error: "Address is too long" });

  const cacheKey = q.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return send(res, 200, cached);

  const params = new URLSearchParams({
    text: q,
    apiKey: key,
    limit: "1",
    filter: `rect:${LONG_ISLAND_RECT}`,
    bias: `rect:${LONG_ISLAND_RECT}`,
    format: "json",
  });

  try {
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
    if (!response.ok) {
      return send(res, response.status === 429 ? 429 : 502, {
        error: response.status === 429 ? "Geocoding quota reached" : "Geocoding service error",
      });
    }

    const data = await response.json();
    const result = data.results && data.results[0];
    if (!result || result.lat == null || result.lon == null) {
      return send(res, 404, { error: "Address not found" });
    }

    const body = {
      lat: result.lat,
      lng: result.lon,
      label: result.formatted || result.address_line1 || q,
    };

    setCached(cacheKey, body);
    return send(res, 200, body);
  } catch (error) {
    return send(res, 502, { error: "Geocoding lookup failed" });
  }
};
