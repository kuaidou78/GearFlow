const wavyCubesVertex = `
  precision highp float;

  attribute vec2 aOffset;
  uniform sampler2D uTrailTexture;
  uniform float uTrailCount;
  uniform float uTrailLifetime;
  uniform float uWaveRadius;
  uniform float uWaveHeight;

  varying float vLift;
  varying vec3 vNormal;

  const int TRAIL_SAMPLES = 24;

  void main() {
    float lift = 0.0;

    for (int index = 0; index < TRAIL_SAMPLES; index++) {
      if (float(index) >= uTrailCount) break;
      vec4 trail = texture2D(uTrailTexture, vec2((float(index) + 0.5) / float(TRAIL_SAMPLES), 0.5));
      float normalizedAge = clamp(trail.b / uTrailLifetime, 0.0, 1.0);
      float distanceToTrail = length(aOffset - trail.rg);
      float normalizedDistance = distanceToTrail / uWaveRadius;
      if (normalizedDistance < 1.0) {
        float distanceFade = 1.0 - smoothstep(0.34, 1.0, normalizedDistance);
        float ageFade = 1.0 - smoothstep(0.0, 1.0, normalizedAge);
        float ripple = 0.86 + 0.14 * cos(normalizedDistance * 8.0 - normalizedAge * 10.0);
        lift += distanceFade * ageFade * ripple * trail.a * uWaveHeight;
      }
    }

    lift = min(lift, uWaveHeight);
    vec3 displaced = position;
    if (position.y > 0.0) displaced.y += lift;

    vLift = lift;
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
  }
`;

export default wavyCubesVertex;
