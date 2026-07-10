const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m'
];
const DEFAULT_TIMEOUT_MS = 8000;

function weatherError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function asFiniteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw weatherError(502, 'WEATHER_DATA_INVALID', `Weather forecast is missing ${field}.`);
  }
  return value;
}

function toUtcHour(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()));
}

function parseHourlyUtc(time) {
  if (typeof time !== 'string') throw weatherError(502, 'WEATHER_DATA_INVALID', 'Weather forecast contains an invalid hour.');
  const date = new Date(time.endsWith('Z') ? time : `${time}Z`);
  if (Number.isNaN(date.getTime())) throw weatherError(502, 'WEATHER_DATA_INVALID', 'Weather forecast contains an invalid hour.');
  return date;
}

function validateHourlyPayload(hourly) {
  if (!hourly || typeof hourly !== 'object' || !Array.isArray(hourly.time)) {
    throw weatherError(502, 'WEATHER_DATA_INVALID', 'Weather forecast data is incomplete.');
  }
  for (const field of HOURLY_FIELDS) {
    if (!Array.isArray(hourly[field]) || hourly[field].length !== hourly.time.length) {
      throw weatherError(502, 'WEATHER_DATA_INVALID', 'Weather forecast data is incomplete.');
    }
  }
}

export function normalizeHourlyWeather(hourly, departureTime) {
  validateHourlyPayload(hourly);
  const departure = new Date(departureTime);
  if (Number.isNaN(departure.getTime())) throw weatherError(400, 'VALIDATION_ERROR', 'departureTime must be a valid date-time.');
  const targetHour = toUtcHour(departure).getTime();
  const index = hourly.time.findIndex((time) => parseHourlyUtc(time).getTime() === targetHour);
  if (index === -1) throw weatherError(422, 'FORECAST_HOUR_NOT_FOUND', 'Departure time is outside the available forecast range.');

  return {
    forecastTime: parseHourlyUtc(hourly.time[index]).toISOString(),
    weather: {
      temperatureC: asFiniteNumber(hourly.temperature_2m[index], 'temperature_2m'),
      apparentTemperatureC: asFiniteNumber(hourly.apparent_temperature[index], 'apparent_temperature'),
      rainProbability: asFiniteNumber(hourly.precipitation_probability[index], 'precipitation_probability'),
      precipitationMm: asFiniteNumber(hourly.precipitation[index], 'precipitation'),
      windSpeedKph: asFiniteNumber(hourly.wind_speed_10m[index], 'wind_speed_10m'),
      windGustKph: asFiniteNumber(hourly.wind_gusts_10m[index], 'wind_gusts_10m')
    }
  };
}

export async function fetchHourlyWeather({ latitude, longitude, departureTime, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof fetchImpl !== 'function') throw weatherError(500, 'WEATHER_FETCH_UNAVAILABLE', 'Weather service is unavailable.');

  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('hourly', HOURLY_FIELDS.join(','));
  url.searchParams.set('timezone', 'UTC');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw weatherError(504, 'WEATHER_TIMEOUT', 'Weather forecast request timed out.');
    throw weatherError(502, 'WEATHER_PROVIDER_ERROR', 'Weather forecast provider is unavailable.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response || !response.ok) throw weatherError(502, 'WEATHER_PROVIDER_ERROR', 'Weather forecast provider is unavailable.');

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw weatherError(502, 'WEATHER_DATA_INVALID', 'Weather forecast provider returned invalid data.');
  }
  return normalizeHourlyWeather(payload?.hourly, departureTime);
}

export { HOURLY_FIELDS, OPEN_METEO_FORECAST_URL };
