import assert from 'node:assert/strict';
import { normalizeAutocompleteResponse, searchPlaces } from '../services/geocoding.service.js';

const payload = {
  type: 'FeatureCollection',
  geocoding: { attribution: 'Terms of Service | openrouteservice' },
  features: [
    { id: 'stable-swu', type: 'Feature', properties: { label: '西南大学，北碚区，重庆市，中国', name: '西南大学', locality: '北碚区', region: '重庆市', country: '中国' }, geometry: { type: 'Point', coordinates: [106.43, 29.82] } },
    { id: 'stable-swu', type: 'Feature', properties: { label: '西南大学，北碚区，重庆市，中国', name: '西南大学' }, geometry: { type: 'Point', coordinates: [106.43, 29.82] } },
    { type: 'Feature', properties: { label: '坏坐标地点' }, geometry: { type: 'Point', coordinates: [999, 29.82] } },
    { type: 'Feature', properties: { label: '缙云山，北碚区，重庆市，中国', name: '缙云山', locality: '北碚区', region: '重庆市', country: '中国' }, geometry: { type: 'Point', coordinates: [106.38, 29.84] } }
  ]
};

const normalized = normalizeAutocompleteResponse(payload, 5);
assert.equal(normalized.places.length, 2);
assert.equal(normalized.places[0].latitude, 29.82);
assert.equal(normalized.places[0].longitude, 106.43);
assert.equal(normalized.places[0].id, 'stable-swu');
assert.equal(normalized.places[0].source, 'openrouteservice');
assert.equal(normalized.attribution, 'Terms of Service | openrouteservice');
assert.equal(normalizeAutocompleteResponse({ type: 'FeatureCollection', features: [] }, 5).places.length, 0);
assert.throws(() => normalizeAutocompleteResponse({ features: [] }, 5), (error) => error.code === 'GEOCODING_DATA_INVALID');

let requestedUrl;
const result = await searchPlaces({
  query: '西南大学',
  limit: 1,
  focus: { latitude: 29.82, longitude: 106.43 },
  getApiKey: () => 'test-key',
  fetchImpl: async (url) => {
    requestedUrl = new URL(url);
    return { ok: true, json: async () => payload };
  }
});
assert.equal(result.places.length, 1);
assert.equal(requestedUrl.searchParams.get('text'), '西南大学');
assert.equal(requestedUrl.searchParams.get('size'), '1');
assert.equal(requestedUrl.searchParams.get('focus.point.lat'), '29.82');
assert.equal(requestedUrl.searchParams.get('focus.point.lon'), '106.43');

await assert.rejects(
  () => searchPlaces({ query: '西南大学', limit: 5, focus: null, getApiKey: () => '', fetchImpl: async () => ({ ok: true }) }),
  (error) => error.code === 'ORS_CONFIGURATION_ERROR'
);
await assert.rejects(
  () => searchPlaces({ query: '西南大学', limit: 5, focus: null, getApiKey: () => 'test-key', fetchImpl: async () => ({ ok: false, status: 401 }) }),
  (error) => error.code === 'ORS_AUTH_FAILED'
);
await assert.rejects(
  () => searchPlaces({ query: '西南大学', limit: 5, focus: null, getApiKey: () => 'test-key', fetchImpl: async () => ({ ok: false, status: 429 }) }),
  (error) => error.code === 'ORS_RATE_LIMITED'
);
await assert.rejects(
  () => searchPlaces({
    query: '西南大学', limit: 5, focus: null, getApiKey: () => 'test-key', timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
  }),
  (error) => error.code === 'ORS_GEOCODING_TIMEOUT'
);

console.log('Geocoding service tests passed.');
