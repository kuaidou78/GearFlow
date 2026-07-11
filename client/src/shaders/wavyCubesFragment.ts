const wavyCubesFragment = `
  precision highp float;

  uniform vec3 uCubeBase;
  uniform vec3 uCubeSide;
  uniform vec3 uRippleOuter;
  uniform vec3 uWaveMid;
  uniform vec3 uWaveHighlight;
  uniform vec3 uPeakHighlight;
  uniform float uWaveHeight;

  varying float vLift;
  varying vec3 vNormal;

  void main() {
    vec3 normal = normalize(vNormal);
    float topFacing = smoothstep(-0.12, 0.76, normal.y);
    float positiveLift = clamp(vLift / uWaveHeight, 0.0, 1.0);
    float negativeLift = clamp(-vLift / uWaveHeight, 0.0, 1.0);
    vec3 color = mix(uCubeSide, uCubeBase, topFacing);
    color = mix(color, color * 0.74, negativeLift * 0.48);
    color = mix(color, uRippleOuter, smoothstep(0.06, 0.34, positiveLift) * 0.58);
    color = mix(color, uWaveMid, smoothstep(0.24, 0.62, positiveLift) * 0.86);
    color = mix(color, uWaveHighlight, smoothstep(0.66, 0.93, positiveLift) * 0.96);
    color = mix(color, uPeakHighlight, smoothstep(0.92, 1.0, positiveLift) * topFacing * 0.9);

    vec3 lightDirection = normalize(vec3(-0.45, 0.82, 0.36));
    float diffuse = 0.74 + 0.34 * max(dot(normal, lightDirection), 0.0);
    float surfaceLift = mix(0.84, 1.12, topFacing);
    gl_FragColor = vec4(color * diffuse * surfaceLift, 1.0);
  }
`;

export default wavyCubesFragment;
