import { evaluateRideRecommendation } from '../services/ride-recommendation.service.js';
import { planRide } from '../services/ride-plan.service.js';
import { fetchRoadCyclingRoute, ROAD_CYCLING_PROFILE } from '../services/route.service.js';
import { fetchHourlyWeather } from '../services/weather.service.js';
import { createError, sendData } from '../utils/response.js';

const RIDE_TYPES = new Set(['recovery', 'casual', 'endurance', 'climbing']);

function validateDepartureTimeAndRideType(body) {
  if (typeof body.departureTime !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(body.departureTime) || Number.isNaN(new Date(body.departureTime).getTime())) throw createError(400, 'VALIDATION_ERROR', 'departureTime must be a valid ISO date-time with a timezone offset.');
  if (!RIDE_TYPES.has(body.rideType)) throw createError(400, 'VALIDATION_ERROR', 'rideType is invalid.');
}

function validateCoordinatePoint(point, field) {
  if (!point || typeof point !== 'object' || Array.isArray(point)) throw createError(400, 'VALIDATION_ERROR', `${field} must be an object.`);
  for (const key of Object.keys(point)) {
    if (!['latitude', 'longitude'].includes(key)) throw createError(400, 'VALIDATION_ERROR', `${field}.${key} is not supported.`);
  }
  finiteNumber(point.latitude, `${field}.latitude`);
  finiteNumber(point.longitude, `${field}.longitude`);
  if (point.latitude < -90 || point.latitude > 90) throw createError(400, 'VALIDATION_ERROR', `${field}.latitude must be between -90 and 90.`);
  if (point.longitude < -180 || point.longitude > 180) throw createError(400, 'VALIDATION_ERROR', `${field}.longitude must be between -180 and 180.`);
}

function finiteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw createError(400, 'VALIDATION_ERROR', `${field} must be a finite number.`);
}

export function validateWeatherAssessmentInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  for (const field of ['latitude', 'longitude', 'distanceKm', 'elevationGainM', 'estimatedDurationMinutes']) finiteNumber(body[field], field);
  if (body.latitude < -90 || body.latitude > 90) throw createError(400, 'VALIDATION_ERROR', 'latitude must be between -90 and 90.');
  if (body.longitude < -180 || body.longitude > 180) throw createError(400, 'VALIDATION_ERROR', 'longitude must be between -180 and 180.');
  validateDepartureTimeAndRideType(body);
  if (body.distanceKm < 0 || body.distanceKm > 1000) throw createError(400, 'VALIDATION_ERROR', 'distanceKm must be between 0 and 1000.');
  if (body.elevationGainM < 0 || body.elevationGainM > 15000) throw createError(400, 'VALIDATION_ERROR', 'elevationGainM must be between 0 and 15000.');
  if (body.estimatedDurationMinutes < 0 || body.estimatedDurationMinutes > 1440) throw createError(400, 'VALIDATION_ERROR', 'estimatedDurationMinutes must be between 0 and 1440.');
}

export function validateRoutePreviewInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  for (const key of Object.keys(body)) {
    if (!['start', 'end'].includes(key)) throw createError(400, 'VALIDATION_ERROR', `${key} is not supported.`);
  }
  validateCoordinatePoint(body.start, 'start');
  validateCoordinatePoint(body.end, 'end');
  if (body.start.latitude === body.end.latitude && body.start.longitude === body.end.longitude) {
    throw createError(400, 'VALIDATION_ERROR', 'Start and end cannot be identical.');
  }
}

export function validateRidePlanInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  for (const key of Object.keys(body)) {
    if (!['start', 'end', 'departureTime', 'rideType'].includes(key)) throw createError(400, 'VALIDATION_ERROR', `${key} is not supported.`);
  }
  validateRoutePreviewInput({ start: body.start, end: body.end });
  validateDepartureTimeAndRideType(body);
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

export function createRoutePreviewController({ getRoadCyclingRoute = fetchRoadCyclingRoute } = {}) {
  return async function routePreview(req, res, next) {
    try {
      validateRoutePreviewInput(req.body);
      const route = await getRoadCyclingRoute({ start: req.body.start, end: req.body.end });
      return sendData(res, {
        profile: ROAD_CYCLING_PROFILE,
        start: req.body.start,
        end: req.body.end,
        route: {
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          elevationGainM: route.elevationGainM,
          elevationLossM: route.elevationLossM,
          geometry: route.geometry,
          bbox: route.bbox
        },
        source: 'openrouteservice',
        attribution: route.attribution
      });
    } catch (error) {
      return next(error);
    }
  };
}

export const routePreview = createRoutePreviewController();

export function createRidePlanController({ createPlan = planRide } = {}) {
  return async function integratedRidePlan(req, res, next) {
    try {
      validateRidePlanInput(req.body);
      return sendData(res, await createPlan(req.body));
    } catch (error) {
      return next(error);
    }
  };
}

export const integratedRidePlan = createRidePlanController();
