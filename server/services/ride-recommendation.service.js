const RECOMMENDATION_THRESHOLDS = {
  temperatureC: { min: -50, cold: 8, comfortableMax: 26, warm: 32, hot: 36, max: 60 },
  rainProbability: { low: 20, medium: 50, high: 75 },
  precipitationMm: { light: 0.5, moderate: 3, heavy: 10, max: 500 },
  windSpeedKph: { normal: 25, elevated: 40, strong: 55, max: 200 },
  windGustKph: { elevated: 40, strong: 55, max: 200 },
  distanceKm: { max: 1000, long: 60 },
  elevationGainM: { max: 15000, high: 700 },
  durationMinutes: { max: 1440, long: 180 }
};

const LEVEL_BOUNDARIES = [
  { minScore: 80, level: 'recommended' },
  { minScore: 60, level: 'suitable' },
  { minScore: 40, level: 'caution' },
  { minScore: 0, level: 'not_recommended' }
];

const RIDE_TYPES = new Set(['recovery', 'casual', 'endurance', 'climbing']);
const REQUIRED_NUMBER_FIELDS = ['temperatureC', 'rainProbability', 'windSpeedKph', 'distanceKm', 'elevationGainM'];
const OPTIONAL_NUMBER_FIELDS = ['apparentTemperatureC', 'precipitationMm', 'windGustKph', 'estimatedDurationMinutes'];

function assertFiniteNumber(input, field) {
  if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) {
    throw new TypeError(`${field} must be a finite number.`);
  }
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Ride recommendation input must be an object.');
  REQUIRED_NUMBER_FIELDS.forEach((field) => assertFiniteNumber(input, field));
  OPTIONAL_NUMBER_FIELDS.forEach((field) => {
    if (input[field] !== undefined && input[field] !== null) assertFiniteNumber(input, field);
  });

  if (!RIDE_TYPES.has(input.rideType)) throw new RangeError('rideType is invalid.');
  if (input.temperatureC < RECOMMENDATION_THRESHOLDS.temperatureC.min || input.temperatureC > RECOMMENDATION_THRESHOLDS.temperatureC.max) throw new RangeError('temperatureC is outside the supported range.');
  if (input.apparentTemperatureC !== undefined && input.apparentTemperatureC !== null && (input.apparentTemperatureC < RECOMMENDATION_THRESHOLDS.temperatureC.min || input.apparentTemperatureC > RECOMMENDATION_THRESHOLDS.temperatureC.max)) throw new RangeError('apparentTemperatureC is outside the supported range.');
  if (input.rainProbability < 0 || input.rainProbability > 100) throw new RangeError('rainProbability must be between 0 and 100.');
  if (input.precipitationMm !== undefined && input.precipitationMm !== null && (input.precipitationMm < 0 || input.precipitationMm > RECOMMENDATION_THRESHOLDS.precipitationMm.max)) throw new RangeError('precipitationMm is outside the supported range.');
  if (input.windSpeedKph < 0 || input.windSpeedKph > RECOMMENDATION_THRESHOLDS.windSpeedKph.max) throw new RangeError('windSpeedKph is outside the supported range.');
  if (input.windGustKph !== undefined && input.windGustKph !== null && (input.windGustKph < 0 || input.windGustKph > RECOMMENDATION_THRESHOLDS.windGustKph.max)) throw new RangeError('windGustKph is outside the supported range.');
  if (input.distanceKm < 0 || input.distanceKm > RECOMMENDATION_THRESHOLDS.distanceKm.max) throw new RangeError('distanceKm is outside the supported range.');
  if (input.elevationGainM < 0 || input.elevationGainM > RECOMMENDATION_THRESHOLDS.elevationGainM.max) throw new RangeError('elevationGainM is outside the supported range.');
  if (input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes !== null && (input.estimatedDurationMinutes < 0 || input.estimatedDurationMinutes > RECOMMENDATION_THRESHOLDS.durationMinutes.max)) throw new RangeError('estimatedDurationMinutes is outside the supported range.');
}

function levelForScore(score) {
  return LEVEL_BOUNDARIES.find((boundary) => score >= boundary.minScore).level;
}

function addFactor(state, code, impact, message, category) {
  if (state.codes.has(code)) return;
  state.codes.add(code);
  state.score += impact;
  state.factors.push({ code, impact, message });
  if (category === 'reason') state.reasons.add(message);
  if (category === 'warning') state.warnings.add(message);
}

function selectRainFactor(input) {
  const probability = input.rainProbability;
  const precipitation = input.precipitationMm;
  const candidates = [];

  if (probability <= RECOMMENDATION_THRESHOLDS.rainProbability.low) candidates.push({ rank: 0, code: 'LOW_RAIN_RISK', impact: 6, message: '降雨风险较低', category: 'reason' });
  else if (probability <= RECOMMENDATION_THRESHOLDS.rainProbability.medium) candidates.push({ rank: 1, code: 'MODERATE_RAIN_PROBABILITY', impact: -7, message: '降雨概率中等，建议关注出发前变化', category: 'warning' });
  else if (probability <= RECOMMENDATION_THRESHOLDS.rainProbability.high) candidates.push({ rank: 2, code: 'HIGH_RAIN_PROBABILITY', impact: -17, message: '降雨概率较高，湿滑路面会影响骑行体验', category: 'warning' });
  else candidates.push({ rank: 3, code: 'VERY_HIGH_RAIN_PROBABILITY', impact: -30, message: '降雨概率极高，不建议安排常规骑行', category: 'warning' });

  if (precipitation !== undefined && precipitation !== null) {
    if (precipitation > RECOMMENDATION_THRESHOLDS.precipitationMm.heavy) candidates.push({ rank: 3, code: 'HEAVY_PRECIPITATION', impact: -30, message: '预期降水量较大，路面和能见度风险增加', category: 'warning' });
    else if (precipitation > RECOMMENDATION_THRESHOLDS.precipitationMm.moderate) candidates.push({ rank: 2, code: 'MODERATE_PRECIPITATION', impact: -17, message: '预期有明显降水，需考虑湿滑路况', category: 'warning' });
    else if (precipitation > RECOMMENDATION_THRESHOLDS.precipitationMm.light) candidates.push({ rank: 1, code: 'LIGHT_PRECIPITATION', impact: -7, message: '可能有小雨，建议准备防水装备', category: 'warning' });
  }

  return candidates.reduce((selected, candidate) => candidate.rank > selected.rank ? candidate : selected);
}

function selectWindFactor(input) {
  const speed = input.windSpeedKph;
  const gust = input.windGustKph;
  const candidates = [];

  if (speed <= RECOMMENDATION_THRESHOLDS.windSpeedKph.normal) candidates.push({ rank: 0, code: 'NORMAL_WIND', impact: 3, message: '风速适中，操控压力较小', category: 'reason' });
  else if (speed <= RECOMMENDATION_THRESHOLDS.windSpeedKph.elevated) candidates.push({ rank: 1, code: 'ELEVATED_WIND', impact: -7, message: '风速偏高，空旷路段需注意侧风', category: 'warning' });
  else if (speed <= RECOMMENDATION_THRESHOLDS.windSpeedKph.strong) candidates.push({ rank: 2, code: 'STRONG_WIND', impact: -17, message: '强风会明显增加操控与体能负担', category: 'warning' });
  else candidates.push({ rank: 3, code: 'DANGEROUS_WIND', impact: -30, message: '风速过高，不建议进行常规骑行', category: 'warning' });

  if (gust !== undefined && gust !== null) {
    if (gust > RECOMMENDATION_THRESHOLDS.windGustKph.strong) candidates.push({ rank: 3, code: 'DANGEROUS_GUSTS', impact: -30, message: '危险阵风可能突然影响车辆稳定性', category: 'warning' });
    else if (gust > RECOMMENDATION_THRESHOLDS.windGustKph.elevated) candidates.push({ rank: 2, code: 'STRONG_GUSTS', impact: -17, message: '强阵风会增加操控和放坡风险', category: 'warning' });
    else if (gust > speed + 10) candidates.push({ rank: 1, code: 'VARIABLE_GUSTS', impact: -7, message: '阵风变化明显，需预留操控余量', category: 'warning' });
  }

  return candidates.reduce((selected, candidate) => candidate.rank > selected.rank ? candidate : selected);
}

function applyTemperatureFactor(state, effectiveTemperature) {
  const thresholds = RECOMMENDATION_THRESHOLDS.temperatureC;
  if (effectiveTemperature < 0) addFactor(state, 'FREEZING_TEMPERATURE', -20, '气温接近冰冻，需警惕结冰和保暖不足', 'warning');
  else if (effectiveTemperature < thresholds.cold) addFactor(state, 'LOW_TEMPERATURE', -10, '气温偏低，注意保暖与路面湿滑', 'warning');
  else if (effectiveTemperature <= thresholds.comfortableMax) addFactor(state, 'COMFORTABLE_TEMPERATURE', 6, '气温舒适，适合骑行', 'reason');
  else if (effectiveTemperature <= thresholds.warm) addFactor(state, 'WARM_TEMPERATURE', -8, '气温偏热，建议提前补水', 'warning');
  else if (effectiveTemperature <= thresholds.hot) addFactor(state, 'HIGH_TEMPERATURE', -16, '气温较高，需控制强度并加强补水', 'warning');
  else addFactor(state, 'EXTREME_HEAT', -30, '气温极高，不建议安排高负荷骑行', 'warning');
}

function applyRideTypeFactors(state, input) {
  const { distanceKm, elevationGainM, rideType } = input;
  if (rideType === 'recovery') {
    if (distanceKm <= 30) addFactor(state, 'RECOVERY_SHORT_DISTANCE', 5, '短距离符合恢复骑行目标', 'reason');
    else if (distanceKm > 50) addFactor(state, 'RECOVERY_LONG_DISTANCE', -12, '恢复骑行距离偏长，可能增加疲劳', 'warning');
    if (elevationGainM <= 300) addFactor(state, 'RECOVERY_LOW_ELEVATION', 5, '较低爬升适合恢复节奏', 'reason');
    else if (elevationGainM > 600) addFactor(state, 'RECOVERY_HIGH_ELEVATION', -32, '高爬升不符合恢复骑行的低负荷目标', 'warning');
    else addFactor(state, 'RECOVERY_MODERATE_ELEVATION', -7, '爬升偏多，恢复骑行应控制强度', 'warning');
  }

  if (rideType === 'casual') {
    if (distanceKm <= 50) addFactor(state, 'CASUAL_DISTANCE_MATCH', 5, '中短距离适合轻松骑行', 'reason');
    else if (distanceKm > 80) addFactor(state, 'CASUAL_LONG_DISTANCE', -15, '距离偏长，不符合轻松骑行定位', 'warning');
    if (elevationGainM <= 600) addFactor(state, 'CASUAL_ELEVATION_MATCH', 4, '爬升强度适合轻松骑行', 'reason');
    else if (elevationGainM > 1000) addFactor(state, 'CASUAL_HIGH_ELEVATION', -12, '爬升偏高，建议降低路线强度', 'warning');
  }

  if (rideType === 'endurance') {
    if (distanceKm >= 50) addFactor(state, 'ENDURANCE_DISTANCE_MATCH', 7, '距离能够提供耐力训练刺激', 'reason');
    else if (distanceKm < 30) addFactor(state, 'ENDURANCE_DISTANCE_TOO_SHORT', -9, '路线偏短，耐力训练刺激有限', 'warning');
    else addFactor(state, 'ENDURANCE_MODERATE_DISTANCE', 2, '距离可作为较短的耐力训练', 'reason');
  }

  if (rideType === 'climbing') {
    if (elevationGainM >= 700) addFactor(state, 'CLIMBING_ELEVATION_MATCH', 9, '路线爬升符合爬坡训练目标', 'reason');
    else if (elevationGainM >= 400) addFactor(state, 'CLIMBING_MODERATE_ELEVATION', 4, '路线具备一定爬坡训练价值', 'reason');
    else addFactor(state, 'CLIMBING_ELEVATION_TOO_LOW', -10, '爬升偏低，爬坡训练针对性不足', 'warning');
  }
}

function applyCombinationFactors(state, input, effectiveTemperature, windRank, rainRank) {
  const isLongDistance = input.distanceKm >= RECOMMENDATION_THRESHOLDS.distanceKm.long;
  const isHighElevation = input.elevationGainM >= RECOMMENDATION_THRESHOLDS.elevationGainM.high;
  const isLongDuration = input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes >= RECOMMENDATION_THRESHOLDS.durationMinutes.long;
  const isHot = effectiveTemperature >= RECOMMENDATION_THRESHOLDS.temperatureC.warm;
  const isCold = effectiveTemperature < RECOMMENDATION_THRESHOLDS.temperatureC.cold;

  if (isHot && isHighElevation && isLongDistance) addFactor(state, 'HEAT_LONG_CLIMBING', -20, '高温、长距离与高爬升叠加，热风险显著增加', 'warning');
  else if (isHot && isHighElevation) addFactor(state, 'HIGH_TEMPERATURE_CLIMBING', -18, '高温与高爬升组合增加热风险', 'warning');
  else if (isHot && (isLongDistance || isLongDuration)) addFactor(state, 'HIGH_TEMPERATURE_ENDURANCE_LOAD', -15, '高温与长时负荷组合增加脱水和过热风险', 'warning');
  else if (effectiveTemperature >= 30 && isLongDuration) addFactor(state, 'WARM_LONG_DURATION', -9, '长时间骑行遇到偏热天气，需更早补水和补给', 'warning');

  if (windRank >= 2 && isLongDistance) addFactor(state, 'STRONG_WIND_LONG_DISTANCE', -12, '强风与长距离组合会明显增加体能消耗', 'warning');
  if (rainRank >= 2 && isCold) addFactor(state, 'RAIN_COLD_COMBINATION', -16, '较强降雨与低温组合会增加失温和湿滑风险', 'warning');
  if (input.windGustKph !== undefined && input.windGustKph >= RECOMMENDATION_THRESHOLDS.windGustKph.elevated && isHighElevation) addFactor(state, 'GUSTY_DESCENT_RISK', -14, '高阵风与高爬升组合会增加放坡稳定性风险', 'warning');
}

export function evaluateRideRecommendation(input) {
  validateInput(input);
  const state = { score: 70, factors: [], reasons: new Set(), warnings: new Set(), codes: new Set() };
  const effectiveTemperature = input.apparentTemperatureC ?? input.temperatureC;
  const rainFactor = selectRainFactor(input);
  const windFactor = selectWindFactor(input);

  addFactor(state, rainFactor.code, rainFactor.impact, rainFactor.message, rainFactor.category);
  addFactor(state, windFactor.code, windFactor.impact, windFactor.message, windFactor.category);
  applyTemperatureFactor(state, effectiveTemperature);
  applyRideTypeFactors(state, input);
  applyCombinationFactors(state, input, effectiveTemperature, windFactor.rank, rainFactor.rank);

  const score = Math.max(0, Math.min(100, Math.round(state.score)));
  return {
    score,
    level: levelForScore(score),
    reasons: [...state.reasons],
    warnings: [...state.warnings],
    factors: state.factors
  };
}

export { LEVEL_BOUNDARIES, RECOMMENDATION_THRESHOLDS };
