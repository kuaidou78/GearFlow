import assert from 'node:assert/strict';
import { fetchRoadCyclingRoute, normalizeRouteGeoJson, ROAD_CYCLING_PROFILE } from '../services/route.service.js';

const payload = {
  bbox: [106.37, 29.81, 106.4, 29.84],
  metadata: { attribution: 'openrouteservice.org | OpenStreetMap contributors' },
  features: [{
    type: 'Feature',
    properties: { summary: { distance: 34821.6, duration: 7560, ascent: 612.4, descent: 608.1 } },
    geometry: { type: 'LineString', coordinates: [[106.4, 29.81, 240], [106.37, 29.84, 285]] }
  }]
};

const normalized = normalizeRouteGeoJson(payload);
assert.equal(normalized.distanceKm, 34.82);
assert.equal(normalized.durationMinutes, 126);
assert.equal(normalized.elevationGainM, 612.4);
assert.equal(normalized.elevationLossM, 608.1);
assert.deepEqual(normalized.geometry, payload.features[0].geometry);
assert.deepEqual(normalized.bbox, payload.bbox);

const noElevation = normalizeRouteGeoJson({ ...payload, features: [{ ...payload.features[0], properties: { summary: { distance: 1000, duration: 600 } } }] });
assert.equal(noElevation.elevationGainM, null);
assert.equal(noElevation.elevationLossM, null);

let request;
const result = await fetchRoadCyclingRoute({
  start: { latitude: 29.81, longitude: 106.4 },
  end: { latitude: 29.84, longitude: 106.37 },
  getApiKey: () => 'test-key',
  fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => payload };
  }
});
assert.equal(result.distanceKm, 34.82);
assert.match(request.url, new RegExp(`/v2/directions/${ROAD_CYCLING_PROFILE}/geojson$`));
assert.equal(request.options.headers.Authorization, 'test-key');
assert.deepEqual(JSON.parse(request.options.body), {
  coordinates: [[106.4, 29.81], [106.37, 29.84]],
  instructions: false,
  elevation: true
});

await assert.rejects(
  () => fetchRoadCyclingRoute({ start: {}, end: {}, getApiKey: () => '', fetchImpl: async () => ({ ok: true }) }),
  (error) => error.code === 'ORS_CONFIGURATION_ERROR'
);
await assert.rejects(
  () => fetchRoadCyclingRoute({ start: {}, end: {}, getApiKey: () => 'test-key', fetchImpl: async () => ({ ok: false, status: 429 }) }),
  (error) => error.code === 'ORS_RATE_LIMITED'
);
await assert.rejects(
  () => fetchRoadCyclingRoute({
    start: {},
    end: {},
    getApiKey: () => 'test-key',
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
  }),
  (error) => error.code === 'ORS_TIMEOUT'
);
assert.throws(() => normalizeRouteGeoJson({ features: [] }), (error) => error.code === 'ROUTE_DATA_INVALID');
assert.throws(() => normalizeRouteGeoJson({ ...payload, features: [{ ...payload.features[0], geometry: { type: 'Point', coordinates: [106.4, 29.81] } }] }), (error) => error.code === 'ROUTE_DATA_INVALID');
assert.throws(() => normalizeRouteGeoJson({ ...payload, features: [{ ...payload.features[0], properties: {} }] }), (error) => error.code === 'ROUTE_DATA_INVALID');

console.log('Route service tests passed.');
