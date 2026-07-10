import assert from 'node:assert/strict';
import { createRoutePreviewController, validateRoutePreviewInput } from '../controllers/ride-planner.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

function createResponse() {
  return {
    body: null,
    json(body) {
      this.body = body;
      return this;
    }
  };
}

const requestBody = {
  start: { latitude: 29.81, longitude: 106.4 },
  end: { latitude: 29.84, longitude: 106.37 }
};

let routeCalls = 0;
const controller = createRoutePreviewController({
  getRoadCyclingRoute: async (input) => {
    routeCalls += 1;
    assert.deepEqual(input, requestBody);
    return {
      distanceKm: 34.8,
      durationMinutes: 126,
      elevationGainM: 612,
      elevationLossM: 608,
      geometry: { type: 'LineString', coordinates: [[106.4, 29.81], [106.37, 29.84]] },
      bbox: [106.37, 29.81, 106.4, 29.84],
      attribution: 'openrouteservice.org | OpenStreetMap contributors'
    };
  }
});
const res = createResponse();
let nextError;
await controller({ body: requestBody }, res, (error) => { nextError = error; });
assert.equal(nextError, undefined);
assert.equal(res.body.data.profile, 'cycling-road');
assert.equal(res.body.data.source, 'openrouteservice');
assert.equal(res.body.data.route.distanceKm, 34.8);
assert.equal(routeCalls, 1);

assert.throws(() => validateRoutePreviewInput({ ...requestBody, profile: 'cycling-regular' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRoutePreviewInput({ ...requestBody, apiKey: 'client-key' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRoutePreviewInput({ ...requestBody, start: { latitude: '29.81', longitude: 106.4 } }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRoutePreviewInput({ ...requestBody, end: requestBody.start }), (error) => error.code === 'VALIDATION_ERROR');

let authError;
await requireAuth({ cookies: {} }, null, (error) => { authError = error; });
assert.equal(authError.status, 401);
assert.equal(authError.code, 'UNAUTHORIZED');

console.log('Ride planner route controller tests passed.');
