const wavyCubesFragment = `
  precision highp float;

  uniform vec3 uCubeBase;
  uniform vec3 uWaveMid;
  uniform vec3 uWaveHighlight;
  uniform vec3 uPeakHighlight;
  uniform float uWaveHeight;

  varying float vLift;
  varying vec3 vNormal;

  void main() {
    float heightRatio = clamp(vLift / uWaveHeight, 0.0, 1.0);
    vec3 color = mix(uCubeBase, uWaveMid, smoothstep(0.10, 0.78, heightRatio) * 0.78);
    color = mix(color, uWaveHighlight, smoothstep(0.68, 0.95, heightRatio));
    color = mix(color, uPeakHighlight, smoothstep(0.965, 1.0, heightRatio) * max(vNormal.y, 0.0));

    vec3 lightDirection = normalize(vec3(-0.45, 0.82, 0.36));
    float lighting = 0.72 + 0.28 * max(dot(normalize(vNormal), lightDirection), 0.0);
    gl_FragColor = vec4(color * lighting, 1.0);
  }
`;

export default wavyCubesFragment;
