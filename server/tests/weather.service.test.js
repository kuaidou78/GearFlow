import assert from 'node:assert/strict';
import { fetchHourlyWeather, normalizeHourlyWeather } from '../services/weather.service.js';

const hourly = {
  time: ['2026-07-10T08:00', '2026-07-10T09:00'],
  temperature_2m: [20, 23],
  apparent_temperature: [19, 22],
  precipitation_probability: [10, 20],
  precipitation: [0, 0.3],
  wind_speed_10m: [12, 18],
  wind_gusts_10m: [18, 28]
};

const departureTime = '2026-07-10T17:00:00+08:00';
const normalized = normalizeHourlyWeather(hourly, departureTime);
assert.equal(normalized.forecastTime, '2026-07-10T09:00:00.000Z');
assert.deepEqual(normalized.weather, {
  temperatureC: 23,
  apparentTemperatureC: 22,
  rainProbability: 20,
  precipitationMm: 0.3,
  windSpeedKph: 18,
  windGustKph: 28
});

let requestedUrl;
const fetchMock = async (url) => {
  requestedUrl = new URL(url);
  return { ok: true, json: async () => ({ hourly }) };
};
const fetched = await fetchHourlyWeather({ latitude: 29.81, longitude: 106.4, departureTime, fetchImpl: fetchMock });
assert.deepEqual(fetched, normalized);
assert.equal(requestedUrl.searchParams.get('timezone'), 'UTC');
assert.equal(requestedUrl.searchParams.get('hourly'), 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m');

assert.throws(() => normalizeHourlyWeather(hourly, '2026-07-12T17:00:00+08:00'), (error) => error.code === 'FORECAST_HOUR_NOT_FOUND');
assert.throws(() => normalizeHourlyWeather({ time: [] }, departureTime), (error) => error.code === 'WEATHER_DATA_INVALID');
assert.throws(() => normalizeHourlyWeather({ ...hourly, time: [null, '2026-07-10T09:00'] }, departureTime), (error) => error.code === 'WEATHER_DATA_INVALID');

await assert.rejects(
  () => fetchHourlyWeather({ latitude: 29.81, longitude: 106.4, departureTime, fetchImpl: async () => ({ ok: false }) }),
  (error) => error.code === 'WEATHER_PROVIDER_ERROR'
);

await assert.rejects(
  () => fetchHourlyWeather({
    latitude: 29.81,
    longitude: 106.4,
    departureTime,
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
  }),
  (error) => error.code === 'WEATHER_TIMEOUT'
);

console.log('Weather service tests passed.');
