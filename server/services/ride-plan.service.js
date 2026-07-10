import { evaluateRideRecommendation } from './ride-recommendation.service.js';
import { ROAD_CYCLING_PROFILE, fetchRoadCyclingRoute } from './route.service.js';
import { fetchHourlyWeather } from './weather.service.js';

function planError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function createRidePlanService({
  getRoadCyclingRoute = fetchRoadCyclingRoute,
  getHourlyWeather = fetchHourlyWeather,
  evaluateRecommendation = evaluateRideRecommendation
} = {}) {
  return async function planRide({ start, end, departureTime, rideType }) {
    const route = await getRoadCyclingRoute({ start, end });
    const weatherForecast = await getHourlyWeather({
      latitude: start.latitude,
      longitude: start.longitude,
      departureTime
    });

    let recommendation;
    try {
      recommendation = evaluateRecommendation({
        ...weatherForecast.weather,
        distanceKm: route.distanceKm,
        elevationGainM: route.elevationGainM,
        estimatedDurationMinutes: route.durationMinutes,
        rideType
      });
    } catch (_error) {
      throw planError(502, 'RECOMMENDATION_INPUT_ERROR', 'Ride recommendation could not be calculated.');
    }

    return {
      request: { start, end, departureTime, rideType },
      route: {
        profile: ROAD_CYCLING_PROFILE,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        elevationGainM: route.elevationGainM,
        elevationLossM: route.elevationLossM,
        geometry: route.geometry,
        bbox: route.bbox
      },
      weather: {
        forecastTime: weatherForecast.forecastTime,
        sampleLocation: { latitude: start.latitude, longitude: start.longitude, strategy: 'start' },
        ...weatherForecast.weather
      },
      recommendation,
      sources: { route: 'openrouteservice', weather: 'open-meteo' },
      attribution: route.attribution
    };
  };
}

export const planRide = createRidePlanService();
