const ORS_AUTOCOMPLETE_URL = 'https://api.openrouteservice.org/geocode/autocomplete';
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_ATTRIBUTION = '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors';

function geocodingError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function validCoordinate(coordinates) {
  return Array.isArray(coordinates)
    && coordinates.length >= 2
    && typeof coordinates[0] === 'number'
    && Number.isFinite(coordinates[0])
    && coordinates[0] >= -180
    && coordinates[0] <= 180
    && typeof coordinates[1] === 'number'
    && Number.isFinite(coordinates[1])
    && coordinates[1] >= -90
    && coordinates[1] <= 90;
}

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function fallbackId(label, longitude, latitude) {
  const value = `${label.toLocaleLowerCase()}|${longitude.toFixed(5)}|${latitude.toFixed(5)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `place_${(hash >>> 0).toString(36)}`;
}

function normalizeFeature(feature) {
  if (!feature || feature.geometry?.type !== 'Point' || !validCoordinate(feature.geometry.coordinates)) return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  const properties = feature.properties && typeof feature.properties === 'object' ? feature.properties : {};
  const name = nullableText(properties.name);
  const locality = nullableText(properties.locality);
  const region = nullableText(properties.region);
  const country = nullableText(properties.country);
  const label = nullableText(properties.label) || [name, locality, region, country].filter(Boolean).join('，') || '未命名地点';
  const upstreamId = nullableText(feature.id) || nullableText(properties.id);
  const id = upstreamId || fallbackId(label, longitude, latitude);
  const dedupeKey = upstreamId || `${label.toLocaleLowerCase()}|${longitude.toFixed(5)}|${latitude.toFixed(5)}`;

  return {
    dedupeKey,
    place: { id, label, name, locality, region, country, latitude, longitude, source: 'openrouteservice' }
  };
}

function providerErrorForStatus(status) {
  if (status === 401 || status === 403) return geocodingError(502, 'ORS_AUTH_FAILED', 'Geocoding provider authentication failed.');
  if (status === 429) return geocodingError(429, 'ORS_RATE_LIMITED', 'Geocoding provider rate limit reached.');
  return geocodingError(502, 'ORS_GEOCODING_PROVIDER_ERROR', 'Geocoding provider is unavailable.');
}

export function normalizeAutocompleteResponse(payload, limit) {
  if (!payload || payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw geocodingError(502, 'GEOCODING_DATA_INVALID', 'Geocoding provider returned invalid data.');
  }
  const seen = new Set();
  const places = [];
  for (const feature of payload.features) {
    const normalized = normalizeFeature(feature);
    if (!normalized || seen.has(normalized.dedupeKey)) continue;
    seen.add(normalized.dedupeKey);
    places.push(normalized.place);
    if (places.length === limit) break;
  }
  return {
    places,
    attribution: nullableText(payload.geocoding?.attribution) || DEFAULT_ATTRIBUTION
  };
}

export async function searchPlaces({ query, limit, focus, fetchImpl = globalThis.fetch, getApiKey = () => process.env.ORS_API_KEY, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = getApiKey();
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw geocodingError(503, 'ORS_CONFIGURATION_ERROR', 'Geocoding provider is not configured.');
  if (typeof fetchImpl !== 'function') throw geocodingError(500, 'GEOCODING_FETCH_UNAVAILABLE', 'Geocoding service is unavailable.');

  const url = new URL(ORS_AUTOCOMPLETE_URL);
  url.searchParams.set('text', query);
  url.searchParams.set('size', String(limit));
  if (focus) {
    url.searchParams.set('focus.point.lat', String(focus.latitude));
    url.searchParams.set('focus.point.lon', String(focus.longitude));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, { headers: { Authorization: apiKey, Accept: 'application/geo+json, application/json' }, signal: controller.signal });
  } catch (_error) {
    if (controller.signal.aborted) throw geocodingError(504, 'ORS_GEOCODING_TIMEOUT', 'Geocoding provider request timed out.');
    throw geocodingError(502, 'ORS_GEOCODING_PROVIDER_ERROR', 'Geocoding provider is unavailable.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response || !response.ok) throw providerErrorForStatus(response?.status);
  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw geocodingError(502, 'GEOCODING_DATA_INVALID', 'Geocoding provider returned invalid data.');
  }
  return normalizeAutocompleteResponse(payload, limit);
}

export { ORS_AUTOCOMPLETE_URL };
