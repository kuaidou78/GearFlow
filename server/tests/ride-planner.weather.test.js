import assert from 'node:assert/strict';
import { createWeatherAssessmentController, validateWeatherAssessmentInput } from '../controllers/ride-planner.controller.js';

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
  latitude: 29.81,
  longitude: 106.4,
  departureTime: '2026-07-10T17:00:00+08:00',
  rideType: 'climbing',
  distanceKm: 35,
  elevationGainM: 650,
  estimatedDurationMinutes: 150
};

let providerCalls = 0;
const controller = createWeatherAssessmentController({
  getHourlyWeather: async (input) => {
    providerCalls += 1;
    assert.deepEqual(input, { latitude: 29.81, longitude: 106.4, departureTime: '2026-07-10T17:00:00+08:00' });
    return {
      forecastTime: '2026-07-10T09:00:00.000Z',
      weather: { temperatureC: 24, apparentTemperatureC: 24, rainProbability: 10, precipitationMm: 0, windSpeedKph: 12, windGustKph: 20 }
    };
  }
});

const res = createResponse();
let nextError;
await controller({ body: requestBody }, res, (error) => { nextError = error; });
assert.equal(nextError, undefined);
assert.equal(res.body.data.source, 'open-meteo');
assert.deepEqual(res.body.data.location, { latitude: 29.81, longitude: 106.4 });
assert.equal(res.body.data.forecastTime, '2026-07-10T09:00:00.000Z');
assert.equal(res.body.data.weather.temperatureC, 24);
assert.equal(res.body.data.recommendation.level, 'recommended');
assert.equal(providerCalls, 1);

assert.throws(() => validateWeatherAssessmentInput({ ...requestBody, latitude: 91 }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateWeatherAssessmentInput({ ...requestBody, departureTime: '2026-07-10T17:00:00' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateWeatherAssessmentInput({ ...requestBody, rideType: 'race' }), (error) => error.code === 'VALIDATION_ERROR');
assert.throws(() => validateWeatherAssessmentInput({ ...requestBody, estimatedDurationMinutes: -1 }), (error) => error.code === 'VALIDATION_ERROR');

const providerError = Object.assign(new Error('provider unavailable'), { status: 502, code: 'WEATHER_PROVIDER_ERROR' });
const failingController = createWeatherAssessmentController({ getHourlyWeather: async () => { throw providerError; } });
let receivedError;
await failingController({ body: requestBody }, createResponse(), (error) => { receivedError = error; });
assert.equal(receivedError, providerError);

console.log('Ride planner weather controller tests passed.');
