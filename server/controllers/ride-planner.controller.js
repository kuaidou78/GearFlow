import { evaluateRideRecommendation } from '../services/ride-recommendation.service.js';
import { planRide } from '../services/ride-plan.service.js';
import { searchPlaces } from '../services/geocoding.service.js';
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

function querySingleValue(value, field) {
  if (typeof value !== 'string') throw createError(400, 'VALIDATION_ERROR', `${field} must be a single query value.`);
  return value;
}

export function validatePlaceSearchQuery(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw createError(400, 'VALIDATION_ERROR', 'Query parameters are invalid.');
  for (const key of Object.keys(query)) {
    if (!['q', 'limit', 'focusLatitude', 'focusLongitude'].includes(key)) throw createError(400, 'VALIDATION_ERROR', `${key} is not supported.`);
  }
  const q = querySingleValue(query.q, 'q').trim();
  if (q.length < 2 || q.length > 120) throw createError(400, 'VALIDATION_ERROR', 'q must contain between 2 and 120 characters.');

  let limit = 5;
  if (query.limit !== undefined) {
    const rawLimit = querySingleValue(query.limit, 'limit');
    if (!/^\d+$/.test(rawLimit)) throw createError(400, 'VALIDATION_ERROR', 'limit must be an integer between 1 and 8.');
    limit = Number(rawLimit);
    if (limit < 1 || limit > 8) throw createError(400, 'VALIDATION_ERROR', 'limit must be between 1 and 8.');
  }

  const hasFocusLatitude = query.focusLatitude !== undefined;
  const hasFocusLongitude = query.focusLongitude !== undefined;
  if (hasFocusLatitude !== hasFocusLongitude) throw createError(400, 'VALIDATION_ERROR', 'focusLatitude and focusLongitude must be provided together.');
  let focus = null;
  if (hasFocusLatitude) {
    const rawLatitude = querySingleValue(query.focusLatitude, 'focusLatitude');
    const rawLongitude = querySingleValue(query.focusLongitude, 'focusLongitude');
    if (!/^[-+]?\d+(\.\d+)?$/.test(rawLatitude) || !/^[-+]?\d+(\.\d+)?$/.test(rawLongitude)) throw createError(400, 'VALIDATION_ERROR', 'Focus coordinates must be finite numbers.');
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw createError(400, 'VALIDATION_ERROR', 'Focus coordinates are outside supported ranges.');
    focus = { latitude, longitude };
  }
  return { query: q, limit, focus };
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

export function createPlaceSearchController({ findPlaces = searchPlaces } = {}) {
  return async function placeSearch(req, res, next) {
    try {
      const input = validatePlaceSearchQuery(req.query);
      const result = await findPlaces(input);
      return sendData(res, { query: input.query, places: result.places, attribution: result.attribution });
    } catch (error) {
      return next(error);
    }
  };
}

export const placeSearch = createPlaceSearchController();
