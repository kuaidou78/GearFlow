const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions';
const ROAD_CYCLING_PROFILE = 'cycling-road';
const DEFAULT_TIMEOUT_MS = 9000;

function routeError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function finiteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw routeError(502, 'ROUTE_DATA_INVALID', `Route response is missing ${field}.`);
  }
  return value;
}

function validCoordinate(coordinate) {
  return Array.isArray(coordinate)
    && coordinate.length >= 2
    && typeof coordinate[0] === 'number'
    && Number.isFinite(coordinate[0])
    && coordinate[0] >= -180
    && coordinate[0] <= 180
    && typeof coordinate[1] === 'number'
    && Number.isFinite(coordinate[1])
    && coordinate[1] >= -90
    && coordinate[1] <= 90;
}

function optionalElevation(value) {
  if (value === undefined || value === null) return null;
  return finiteNumber(value, 'elevation summary');
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function providerErrorForStatus(status) {
  if (status === 401 || status === 403) return routeError(502, 'ORS_AUTH_FAILED', 'Route provider authentication failed.');
  if (status === 429) return routeError(429, 'ORS_RATE_LIMITED', 'Route provider rate limit reached.');
  if (status === 400 || status === 404 || status === 422) return routeError(422, 'ORS_ROUTE_NOT_FOUND', 'Route provider could not find a road-cycling route for these points.');
  return routeError(502, 'ORS_PROVIDER_ERROR', 'Route provider is unavailable.');
}

export function normalizeRouteGeoJson(payload) {
  const feature = payload?.features?.[0];
  const geometry = feature?.geometry;
  const summary = feature?.properties?.summary;
  if (!feature) throw routeError(502, 'ROUTE_DATA_INVALID', 'Route provider returned no route feature.');
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || !geometry.coordinates.every(validCoordinate)) {
    throw routeError(502, 'ROUTE_DATA_INVALID', 'Route provider returned invalid route geometry.');
  }
  if (!summary || typeof summary !== 'object') throw routeError(502, 'ROUTE_DATA_INVALID', 'Route provider returned no route summary.');

  const distanceMeters = finiteNumber(summary.distance, 'summary distance');
  const durationSeconds = finiteNumber(summary.duration, 'summary duration');
  if (distanceMeters < 0 || durationSeconds < 0) throw routeError(502, 'ROUTE_DATA_INVALID', 'Route provider returned an invalid route summary.');

  return {
    distanceKm: round(distanceMeters / 1000, 2),
    durationMinutes: round(durationSeconds / 60, 1),
    elevationGainM: optionalElevation(summary.ascent ?? feature.properties?.ascent),
    elevationLossM: optionalElevation(summary.descent ?? feature.properties?.descent),
    geometry: { type: 'LineString', coordinates: geometry.coordinates },
    bbox: Array.isArray(feature.bbox) ? feature.bbox : (Array.isArray(payload.bbox) ? payload.bbox : null),
    attribution: typeof payload?.metadata?.attribution === 'string' && payload.metadata.attribution.trim()
      ? payload.metadata.attribution
      : 'openrouteservice.org | OpenStreetMap contributors'
  };
}

export async function fetchRoadCyclingRoute({ start, end, fetchImpl = globalThis.fetch, getApiKey = () => process.env.ORS_API_KEY, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = getApiKey();
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw routeError(503, 'ORS_CONFIGURATION_ERROR', 'Route provider is not configured.');
  if (typeof fetchImpl !== 'function') throw routeError(500, 'ORS_FETCH_UNAVAILABLE', 'Route service is unavailable.');

  const url = `${ORS_DIRECTIONS_URL}/${ROAD_CYCLING_PROFILE}/geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json, application/json'
      },
      body: JSON.stringify({
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude]
        ],
        instructions: false,
        elevation: true
      }),
      signal: controller.signal
    });
  } catch (_error) {
    if (controller.signal.aborted) throw routeError(504, 'ORS_TIMEOUT', 'Route provider request timed out.');
    throw routeError(502, 'ORS_PROVIDER_ERROR', 'Route provider is unavailable.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response || !response.ok) throw providerErrorForStatus(response?.status);
  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw routeError(502, 'ROUTE_DATA_INVALID', 'Route provider returned invalid data.');
  }
  return normalizeRouteGeoJson(payload);
}

export { ROAD_CYCLING_PROFILE };
