import assert from 'node:assert/strict';
import { evaluateRideRecommendation } from '../services/ride-recommendation.service.js';

const calmWeather = {
  temperatureC: 22,
  rainProbability: 10,
  precipitationMm: 0,
  windSpeedKph: 12
};

function evaluate(overrides) {
  return evaluateRideRecommendation({ ...calmWeather, ...overrides });
}

function hasFactor(result, code) {
  return result.factors.some((factor) => factor.code === code);
}

function hasText(items, text) {
  return items.some((item) => item.includes(text));
}

const casual = evaluate({ distanceKm: 30, elevationGainM: 200, rideType: 'casual' });
assert.ok(['recommended', 'suitable'].includes(casual.level));
assert.ok(casual.score >= 60);
assert.deepEqual(evaluate({ distanceKm: 30, elevationGainM: 200, rideType: 'casual' }), casual);

const precipitationOverride = evaluate({ distanceKm: 30, elevationGainM: 200, rainProbability: 10, precipitationMm: 4, rideType: 'casual' });
assert.ok(hasFactor(precipitationOverride, 'MODERATE_PRECIPITATION'));

const apparentHeat = evaluate({ temperatureC: 22, apparentTemperatureC: 37, distanceKm: 30, elevationGainM: 200, rideType: 'casual' });
assert.ok(hasFactor(apparentHeat, 'EXTREME_HEAT'));

const hotClimbing = evaluate({ temperatureC: 36, apparentTemperatureC: 37, distanceKm: 80, elevationGainM: 1200, estimatedDurationMinutes: 260, rideType: 'climbing' });
assert.ok(hotClimbing.score < casual.score);
assert.ok(hasFactor(hotClimbing, 'HEAT_LONG_CLIMBING'));
assert.ok(hasText(hotClimbing.warnings, '热风险'));

const wetWindyEndurance = evaluate({ temperatureC: 16, rainProbability: 75, precipitationMm: 4, windSpeedKph: 48, distanceKm: 75, elevationGainM: 500, rideType: 'endurance' });
assert.ok(['caution', 'not_recommended'].includes(wetWindyEndurance.level));
assert.ok(hasFactor(wetWindyEndurance, 'STRONG_WIND_LONG_DISTANCE'));

const recoveryClimb = evaluate({ distanceKm: 20, elevationGainM: 650, rideType: 'recovery' });
assert.ok(hasFactor(recoveryClimb, 'RECOVERY_HIGH_ELEVATION'));
assert.ok(recoveryClimb.score < casual.score);
assert.equal(recoveryClimb.level, 'caution');

const normalClimbing = evaluate({ distanceKm: 40, elevationGainM: 800, rideType: 'climbing' });
assert.ok(hasFactor(normalClimbing, 'CLIMBING_ELEVATION_MATCH'));
assert.ok(normalClimbing.score >= 80);

const shortEndurance = evaluate({ distanceKm: 10, elevationGainM: 40, rideType: 'endurance' });
assert.ok(hasFactor(shortEndurance, 'ENDURANCE_DISTANCE_TOO_SHORT'));
assert.ok(hasText(shortEndurance.warnings, '耐力训练刺激有限'));

const unknownElevation = evaluate({ distanceKm: 40, elevationGainM: null, rideType: 'climbing' });
assert.ok(hasFactor(unknownElevation, 'UNKNOWN_ELEVATION'));
assert.ok(hasText(unknownElevation.warnings, '未提供爬升数据'));

const gustyClimb = evaluate({ distanceKm: 40, elevationGainM: 900, windSpeedKph: 25, windGustKph: 58, rideType: 'climbing' });
assert.ok(hasFactor(gustyClimb, 'GUSTY_DESCENT_RISK'));
assert.ok(hasText(gustyClimb.warnings, '放坡稳定性'));

const coldRain = evaluate({ temperatureC: 4, rainProbability: 80, precipitationMm: 8, windSpeedKph: 20, distanceKm: 35, elevationGainM: 200, rideType: 'casual' });
assert.ok(hasFactor(coldRain, 'RAIN_COLD_COMBINATION'));

const extreme = evaluate({ temperatureC: 50, rainProbability: 100, precipitationMm: 20, windSpeedKph: 80, windGustKph: 90, distanceKm: 500, elevationGainM: 5000, estimatedDurationMinutes: 800, rideType: 'climbing' });
assert.ok(extreme.score >= 0 && extreme.score <= 100);
assert.ok(Number.isFinite(extreme.score));
assert.equal(new Set(extreme.warnings).size, extreme.warnings.length);
assert.equal(new Set(extreme.factors.map((factor) => factor.code)).size, extreme.factors.length);

assert.throws(() => evaluate({ rainProbability: 101, distanceKm: 30, elevationGainM: 100, rideType: 'casual' }), RangeError);
assert.throws(() => evaluate({ temperatureC: Number.NaN, distanceKm: 30, elevationGainM: 100, rideType: 'casual' }), TypeError);
assert.throws(() => evaluate({ windSpeedKph: Number.POSITIVE_INFINITY, distanceKm: 30, elevationGainM: 100, rideType: 'casual' }), TypeError);
assert.throws(() => evaluate({ distanceKm: -1, elevationGainM: 100, rideType: 'casual' }), RangeError);
assert.throws(() => evaluate({ distanceKm: 30, elevationGainM: 100, estimatedDurationMinutes: -1, rideType: 'casual' }), RangeError);
assert.throws(() => evaluate({ distanceKm: 30, elevationGainM: 100, rideType: 'race' }), RangeError);

console.log('Ride recommendation rule tests passed.');
