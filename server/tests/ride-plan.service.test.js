import assert from 'node:assert/strict';
import { createRidePlanService } from '../services/ride-plan.service.js';

const input = {
  start: { latitude: 29.81, longitude: 106.4 },
  end: { latitude: 29.84, longitude: 106.37 },
  departureTime: '2026-07-11T10:00:00+08:00',
  rideType: 'climbing'
};

const route = {
  distanceKm: 34.8,
  durationMinutes: 126,
  elevationGainM: 612,
  elevationLossM: 608,
  geometry: { type: 'LineString', coordinates: [[106.4, 29.81], [106.37, 29.84]] },
  bbox: [106.37, 29.81, 106.4, 29.84],
  attribution: 'openrouteservice.org | OpenStreetMap contributors'
};
const weatherForecast = {
  forecastTime: '2026-07-11T02:00:00.000Z',
  weather: { temperatureC: 24, apparentTemperatureC: 23, rainProbability: 10, precipitationMm: 0, windSpeedKph: 12, windGustKph: 20 }
};

let routeInput;
let weatherInput;
let recommendationInput;
const plan = createRidePlanService({
  getRoadCyclingRoute: async (value) => { routeInput = value; return route; },
  getHourlyWeather: async (value) => { weatherInput = value; return weatherForecast; },
  evaluateRecommendation: (value) => {
    recommendationInput = value;
    return { score: 84, level: 'recommended', reasons: ['测试'], warnings: [], factors: [] };
  }
});
const result = await plan(input);
assert.deepEqual(routeInput, { start: input.start, end: input.end });
assert.deepEqual(weatherInput, { latitude: 29.81, longitude: 106.4, departureTime: input.departureTime });
assert.equal(recommendationInput.distanceKm, 34.8);
assert.equal(recommendationInput.elevationGainM, 612);
assert.equal(recommendationInput.estimatedDurationMinutes, 126);
assert.equal(recommendationInput.temperatureC, 24);
assert.equal(result.route.profile, 'cycling-road');
assert.equal(result.weather.sampleLocation.strategy, 'start');
assert.equal(result.sources.route, 'openrouteservice');
assert.equal(JSON.stringify(result).includes('test-key'), false);

let weatherCalled = false;
const routeFailure = createRidePlanService({
  getRoadCyclingRoute: async () => { throw Object.assign(new Error('no route'), { code: 'ORS_ROUTE_NOT_FOUND' }); },
  getHourlyWeather: async () => { weatherCalled = true; return weatherForecast; }
});
await assert.rejects(() => routeFailure(input), (error) => error.code === 'ORS_ROUTE_NOT_FOUND');
assert.equal(weatherCalled, false);

const weatherFailure = createRidePlanService({
  getRoadCyclingRoute: async () => route,
  getHourlyWeather: async () => { throw Object.assign(new Error('weather unavailable'), { code: 'WEATHER_PROVIDER_ERROR' }); }
});
await assert.rejects(() => weatherFailure(input), (error) => error.code === 'WEATHER_PROVIDER_ERROR');

const recommendationFailure = createRidePlanService({
  getRoadCyclingRoute: async () => route,
  getHourlyWeather: async () => weatherForecast,
  evaluateRecommendation: () => { throw new TypeError('invalid recommendation input'); }
});
await assert.rejects(() => recommendationFailure(input), (error) => error.code === 'RECOMMENDATION_INPUT_ERROR');

let nullElevationInput;
const unknownElevation = createRidePlanService({
  getRoadCyclingRoute: async () => ({ ...route, elevationGainM: null, elevationLossM: null }),
  getHourlyWeather: async () => weatherForecast,
  evaluateRecommendation: (value) => { nullElevationInput = value; return { score: 70, level: 'suitable', reasons: [], warnings: ['路线未提供爬升数据'], factors: [] }; }
});
const unknownElevationResult = await unknownElevation(input);
assert.equal(nullElevationInput.elevationGainM, null);
assert.equal(unknownElevationResult.route.elevationGainM, null);

console.log('Ride plan service tests passed.');
