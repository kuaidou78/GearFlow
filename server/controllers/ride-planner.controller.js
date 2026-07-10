import { evaluateRideRecommendation } from '../services/ride-recommendation.service.js';
import { fetchHourlyWeather } from '../services/weather.service.js';
import { createError, sendData } from '../utils/response.js';

const RIDE_TYPES = new Set(['recovery', 'casual', 'endurance', 'climbing']);

function finiteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw createError(400, 'VALIDATION_ERROR', `${field} must be a finite number.`);
}

export function validateWeatherAssessmentInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  for (const field of ['latitude', 'longitude', 'distanceKm', 'elevationGainM', 'estimatedDurationMinutes']) finiteNumber(body[field], field);
  if (body.latitude < -90 || body.latitude > 90) throw createError(400, 'VALIDATION_ERROR', 'latitude must be between -90 and 90.');
  if (body.longitude < -180 || body.longitude > 180) throw createError(400, 'VALIDATION_ERROR', 'longitude must be between -180 and 180.');
  if (typeof body.departureTime !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(body.departureTime) || Number.isNaN(new Date(body.departureTime).getTime())) throw createError(400, 'VALIDATION_ERROR', 'departureTime must be a valid ISO date-time with a timezone offset.');
  if (!RIDE_TYPES.has(body.rideType)) throw createError(400, 'VALIDATION_ERROR', 'rideType is invalid.');
  if (body.distanceKm < 0 || body.distanceKm > 1000) throw createError(400, 'VALIDATION_ERROR', 'distanceKm must be between 0 and 1000.');
  if (body.elevationGainM < 0 || body.elevationGainM > 15000) throw createError(400, 'VALIDATION_ERROR', 'elevationGainM must be between 0 and 15000.');
  if (body.estimatedDurationMinutes < 0 || body.estimatedDurationMinutes > 1440) throw createError(400, 'VALIDATION_ERROR', 'estimatedDurationMinutes must be between 0 and 1440.');
}

export function createWeatherAssessmentController({ getHourlyWeather = fetchHourlyWeather } = {}) {
  return async function weatherAssessment(req, res, next) {
    try {
      validateWeatherAssessmentInput(req.body);
      const { latitude, longitude, departureTime, rideType, distanceKm, elevationGainM, estimatedDurationMinutes } = req.body;
      const forecast = await getHourlyWeather({ latitude, longitude, departureTime });
      const recommendation = evaluateRideRecommendation({
        ...forecast.weather,
        rideType,
        distanceKm,
        elevationGainM,
        estimatedDurationMinutes
      });
      return sendData(res, {
        location: { latitude, longitude },
        forecastTime: forecast.forecastTime,
        weather: forecast.weather,
        recommendation,
        source: 'open-meteo'
      });
    } catch (error) {
      return next(error);
    }
  };
}

export const weatherAssessment = createWeatherAssessmentController();
