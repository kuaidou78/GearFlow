import assert from 'node:assert/strict';
import { createRidePlanController, validateRidePlanInput } from '../controllers/ride-planner.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

function createResponse() {
  return { body: null, json(body) { this.body = body; return this; } };
}

const requestBody = {
  start: { latitude: 29.81, longitude: 106.4 },
  end: { latitude: 29.84, longitude: 106.37 },
  departureTime: '2026-07-11T10:00:00+08:00',
  rideType: 'climbing'
};
const expectedPlan = {
  request: requestBody,
  route: { profile: 'cycling-road', distanceKm: 34.8, durationMinutes: 126, elevationGainM: null, elevationLossM: null, geometry: { type: 'LineString', coordinates: [[106.4, 29.81], [106.37, 29.84]] }, bbox: null },
  weather: { forecastTime: '2026-07-11T02:00:00.000Z', sampleLocation: { latitude: 29.81, longitude: 106.4, strategy: 'start' }, temperatureC: 24, apparentTemperatureC: 23, rainProbability: 10, precipitationMm: 0, windSpeedKph: 12, windGustKph: 20 },
  recommendation: { score: 70, level: 'suitable', reasons: [], warnings: ['路线未提供爬升数据'], factors: [] },
  sources: { route: 'openrouteservice', weather: 'open-meteo' },
  attribution: 'openrouteservice.org | OpenStreetMap contributors'
};

let planInput;
const controller = createRidePlanController({ createPlan: async (input) => { planInput = input; return expectedPlan; } });
const res = createResponse();
let nextError;
await controller({ body: requestBody }, res, (error) => { nextError = error; });
assert.equal(nextError, undefined);
assert.deepEqual(planInput, requestBody);
assert.equal(res.body.data.route.geometry.type, 'LineString');
assert.equal(JSON.stringify(res.body).includes('apiKey'), false);
assert.equal(JSON.stringify(res.body).includes('metadata'), false);

assert.throws(() => validateRidePlanInput({ ...requestBody, profile: 'cycling-regular' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRidePlanInput({ ...requestBody, start: { latitude: '29.81', longitude: 106.4 } }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRidePlanInput({ ...requestBody, end: requestBody.start }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRidePlanInput({ ...requestBody, departureTime: '2026-07-11T10:00:00' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateRidePlanInput({ ...requestBody, rideType: 'race' }), (error) => error.code === 'VALIDATION_ERROR');

let authError;
await requireAuth({ cookies: {} }, null, (error) => { authError = error; });
assert.equal(authError.status, 401);
assert.equal(authError.code, 'UNAUTHORIZED');

console.log('Ride planner plan controller tests passed.');
