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
    float wake = 0.0;

    for (int index = 0; index < TRAIL_SAMPLES; index++) {
      if (float(index) >= uTrailCount) break;
      vec4 trail = texture2D(uTrailTexture, vec2((float(index) + 0.5) / float(TRAIL_SAMPLES), 0.5));
      float normalizedAge = clamp(trail.b / uTrailLifetime, 0.0, 1.0);
      float distanceToTrail = length(aOffset - trail.rg);
      float normalizedDistance = distanceToTrail / uWaveRadius;
      if (normalizedDistance < 1.0) {
        float ageFade = 1.0 - smoothstep(0.78, 1.0, normalizedAge);
        float coreWake = 1.0 - smoothstep(0.0, 0.34, normalizedDistance);
        float propagation = mix(0.1, 0.62, normalizedAge);
        float crestDistance = abs(normalizedDistance - propagation);
        float crest = 1.0 - smoothstep(0.035, 0.12, crestDistance);
        float secondCrest = (1.0 - smoothstep(0.055, 0.16, abs(normalizedDistance - propagation * 0.62))) * 0.3;
        float trough = (1.0 - smoothstep(0.06, 0.2, abs(normalizedDistance - max(0.0, propagation - 0.2)))) * 0.24;
        float outerFade = 1.0 - smoothstep(0.74, 1.0, normalizedDistance);
        float candidate = (coreWake * 0.26 + crest * 0.86 + secondCrest - trough) * ageFade * outerFade * trail.a;
        lift = max(lift, candidate * uWaveHeight);
        wake = max(wake, coreWake * ageFade * trail.a);
      }
    }

    lift += wake * uWaveHeight * 0.1;
    lift = clamp(lift, -uWaveHeight * 0.18, uWaveHeight * 0.82);
    vec3 displaced = position;
    if (position.y > 0.0) displaced.y += lift;

    vLift = lift;
    vNormal = normalize(mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
  }
`;

export default wavyCubesVertex;
