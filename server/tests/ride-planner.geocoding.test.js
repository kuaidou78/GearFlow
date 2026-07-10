import assert from 'node:assert/strict';
import { createPlaceSearchController, validatePlaceSearchQuery } from '../controllers/ride-planner.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

function createResponse() {
  return { body: null, json(body) { this.body = body; return this; } };
}

const query = { q: '西南大学', limit: '5', focusLatitude: '29.82', focusLongitude: '106.43' };
const validated = validatePlaceSearchQuery(query);
assert.deepEqual(validated, { query: '西南大学', limit: 5, focus: { latitude: 29.82, longitude: 106.43 } });

let searchInput;
const controller = createPlaceSearchController({
  findPlaces: async (input) => {
    searchInput = input;
    return { places: [{ id: 'swu', label: '西南大学', name: '西南大学', locality: '北碚区', region: '重庆市', country: '中国', latitude: 29.82, longitude: 106.43, source: 'openrouteservice' }], attribution: 'Terms of Service | openrouteservice' };
  }
});
const res = createResponse();
let nextError;
await controller({ query }, res, (error) => { nextError = error; });
assert.equal(nextError, undefined);
assert.deepEqual(searchInput, validated);
assert.equal(res.body.data.places.length, 1);
assert.equal(JSON.stringify(res.body).includes('apiKey'), false);
assert.equal(JSON.stringify(res.body).includes('metadata'), false);

assert.throws(() => validatePlaceSearchQuery({ q: 'A' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: 'A'.repeat(121) }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: '西南大学', limit: '1.5' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: '西南大学', limit: '9' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: '西南大学', focusLatitude: '29.82' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: '西南大学', focusLatitude: 'Infinity', focusLongitude: '106.43' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: '西南大学', sources: 'osm' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validatePlaceSearchQuery({ q: ['西南大学'] }), (error) => error.code === 'VALIDATION_ERROR');

let authError;
await requireAuth({ cookies: {} }, null, (error) => { authError = error; });
assert.equal(authError.status, 401);
assert.equal(authError.code, 'UNAUTHORIZED');

console.log('Ride planner geocoding controller tests passed.');
