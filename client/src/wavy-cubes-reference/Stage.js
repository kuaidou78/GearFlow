import * as THREE from 'three';
import MouseTrail from './Effects/MouseTrail.js';

export default class Stage {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.scene = this.orchestrator.scene;
    this.gridSize = 40;
    this.cubeWidth = 0.8;
    this.cubeHeight = 3;
    this.params = {
      gap: 0.01,
      waveAmplitude: 0.4,
      waveSpeed: 6.0,
      waveFrequency: 1.2,
      waveWidth: 3.0,
      waveJitter: 0.2,
      waveMaxHeight: 0.4,
      colorBase: this.orchestrator.theme.base ?? '#ffffff',
      colorHigh: this.orchestrator.theme.highlight ?? '#0055ff'
    };
    this.scene.background = new THREE.Color(this.orchestrator.theme.background ?? this.params.colorBase).multiplyScalar(this.orchestrator.theme.background ? 1 : 0.5);
    this.lightingParams = {
      ambientColor: '#ffffff', ambientIntensity: this.orchestrator.theme.ambientIntensity ?? 0.5,
      directionalColor: '#ffffff', directionalIntensity: 4.0,
      directional2Color: '#ffffff', directional2Intensity: this.orchestrator.theme.fillIntensity ?? 1.0
    };
    this.bounds = this.gridSize * (this.cubeWidth + this.params.gap);
    this.shaderRef = null;
    this.setLighting();
    this.mouseTrail = new MouseTrail(this.orchestrator, this.bounds);
    this.setGrid();
    this.setGUI();
  }

  setLighting() {
    const light = this.lightingParams;
    this.ambientLight = new THREE.AmbientLight(light.ambientColor, light.ambientIntensity);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(light.directionalColor, light.directionalIntensity);
    this.directionalLight.position.set(-20, 10, 6);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(1024, 1024);
    this.directionalLight.shadow.radius = 6;
    Object.assign(this.directionalLight.shadow.camera, { near: 0.1, far: 60, left: -22, right: 22, top: 22, bottom: -22 });
    this.directionalLight.shadow.camera.updateProjectionMatrix();
    this.directionalLight.shadow.bias = 0.0001;
    this.scene.add(this.directionalLight);
    this.directionalLight2 = new THREE.DirectionalLight(light.directional2Color, light.directional2Intensity);
    this.directionalLight2.position.set(10, 5, -3);
    this.scene.add(this.directionalLight2);
    this.shadowCameraHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
    this.shadowCameraHelper.visible = false;
    this.scene.add(this.shadowCameraHelper);
  }

  overrideVertexShader(vertexShader) {
    return vertexShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;
        attribute vec2 aOffset;
        uniform sampler2D uTrailTexture;
        uniform int uTrailCount;
        uniform float uWaveSpeed;
        uniform float uWaveFreq;
        uniform float uWaveWidth;
        uniform float uFadeTime;
        uniform float uAmplitude;
        uniform float uJitter;
        uniform float uMaxHeight;
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123) - 0.5;
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHeight = 0.0;
        if (position.y > 0.0) {
          vec2 jitter = hash2(aOffset) * uJitter;
          vec2 worldXZ = aOffset + jitter;
          float waveHeight = 0.0;
          float totalWeight = 0.0;
          for (int i = 0; i < uTrailCount; i++) {
            vec4 td = texture2D(uTrailTexture, vec2((float(i) + 0.5) / 128.0, 0.5));
            float dist = length(worldXZ - td.rg);
            float wavefront = uWaveSpeed * td.b;
            float relDist = dist - wavefront;
            float window = exp(-(relDist * relDist) / (uWaveWidth * uWaveWidth));
            float fade = exp(-td.b / uFadeTime);
            float atten = 1.0 / (1.0 + dist * 0.1);
            float weight = fade * window * atten * td.a;
            waveHeight += weight * cos(uWaveFreq * relDist);
            totalWeight += weight;
          }
          waveHeight /= max(totalWeight, 1.0);
          float displacement = clamp(waveHeight * uAmplitude, -uMaxHeight, uMaxHeight);
          transformed.y += displacement;
          vHeight = displacement;
        }`);
  }

  setGrid() {
    const count = this.gridSize * this.gridSize;
    this.geometry = new THREE.BoxGeometry(this.cubeWidth, this.cubeHeight, this.cubeWidth);
    this.offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
    this.geometry.setAttribute('aOffset', this.offsetAttribute);
    this.material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.material.onBeforeCompile = (shader) => this.configureMainShader(shader);
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.onBeforeCompile = (shader) => this.configureDepthShader(shader);
    this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.instancedMesh.customDepthMaterial = this.depthMaterial;
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;
    this.scene.add(this.instancedMesh);
    this.updateGrid();
  }

  configureWaveUniforms(shader) {
    const trailUniforms = this.mouseTrail.uniforms;
    shader.uniforms.uTrailTexture = trailUniforms.uTrailTexture;
    shader.uniforms.uTrailCount = trailUniforms.uTrailCount;
    shader.uniforms.uFadeTime = trailUniforms.uFadeTime;
    shader.uniforms.uWaveSpeed = { value: this.params.waveSpeed };
    shader.uniforms.uWaveFreq = { value: this.params.waveFrequency };
    shader.uniforms.uWaveWidth = { value: this.params.waveWidth };
    shader.uniforms.uAmplitude = { value: this.params.waveAmplitude };
    shader.uniforms.uJitter = { value: this.params.waveJitter };
    shader.uniforms.uMaxHeight = { value: this.params.waveMaxHeight };
  }

  configureMainShader(shader) {
    this.configureWaveUniforms(shader);
    shader.uniforms.uColorBase = { value: new THREE.Color(this.params.colorBase) };
    shader.uniforms.uColorHigh = { value: new THREE.Color(this.params.colorHigh) };
    shader.vertexShader = this.overrideVertexShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;
        uniform vec3 uColorBase;
        uniform vec3 uColorHigh;
        uniform float uMaxHeight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float t = clamp(vHeight / uMaxHeight, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, t);`);
    this.shaderRef = shader;
  }

  configureDepthShader(shader) {
    this.configureWaveUniforms(shader);
    shader.vertexShader = this.overrideVertexShader(shader.vertexShader);
  }

  updateGrid() {
    const dummy = new THREE.Object3D();
    const spacing = this.cubeWidth + this.params.gap;
    const offset = ((this.gridSize - 1) * spacing) / 2;
    for (let i = 0; i < this.gridSize; i += 1) {
      for (let j = 0; j < this.gridSize; j += 1) {
        const index = i * this.gridSize + j;
        const x = i * spacing - offset;
        const z = j * spacing - offset;
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(index, dummy.matrix);
        this.offsetAttribute.setXY(index, x, z);
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.offsetAttribute.needsUpdate = true;
  }

  setGUI() {
    const gui = this.orchestrator.debug.ui;
    if (!gui) return;
    gui.add(this.params, 'gap', 0, 1, 0.01).name('Gap').onChange(() => this.updateGrid());
    gui.add(this.params, 'waveAmplitude', 0, 10, 0.01).name('Wave Amplitude').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uAmplitude.value = value; });
    gui.add(this.params, 'waveSpeed', 1, 20, 0.1).name('Wave Speed').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uWaveSpeed.value = value; });
    gui.add(this.params, 'waveFrequency', 0.1, 5, 0.05).name('Wave Frequency').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uWaveFreq.value = value; });
    gui.add(this.params, 'waveWidth', 0.5, 10, 0.1).name('Wave Width').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uWaveWidth.value = value; });
    gui.add(this.params, 'waveMaxHeight', 0, this.cubeHeight, 0.05).name('Wave Max Height').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uMaxHeight.value = value; });
    gui.add(this.params, 'waveJitter', 0, 2, 0.01).name('Wave Jitter').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uJitter.value = value; });
    gui.addColor(this.params, 'colorBase').name('Base Color').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uColorBase.value.set(value); this.scene.background = new THREE.Color(value).multiplyScalar(0.5); });
    gui.addColor(this.params, 'colorHigh').name('Wave Color').onChange((value) => { if (this.shaderRef) this.shaderRef.uniforms.uColorHigh.value.set(value); });
    const trailFolder = gui.addFolder('Trail');
    trailFolder.add(this.mouseTrail.params, 'fadeTime', 0.2, 6, 0.1).name('Fade Time').onChange((value) => { this.mouseTrail.uniforms.uFadeTime.value = value; });
    trailFolder.add(this.mouseTrail.params, 'trailSpacing', 0.1, 3, 0.05).name('Trail Spacing');
    trailFolder.open();
    const lighting = gui.addFolder('Lighting');
    lighting.addColor(this.lightingParams, 'ambientColor').name('Ambient Color').onChange((value) => this.ambientLight.color.set(value));
    lighting.add(this.lightingParams, 'ambientIntensity', 0.1, 5, 0.01).name('Ambient Intensity').onChange((value) => { this.ambientLight.intensity = value; });
    lighting.addColor(this.lightingParams, 'directionalColor').name('Key Light Color').onChange((value) => this.directionalLight.color.set(value));
    lighting.add(this.lightingParams, 'directionalIntensity', 0.1, 10, 0.01).name('Key Light Intensity').onChange((value) => { this.directionalLight.intensity = value; });
    lighting.addColor(this.lightingParams, 'directional2Color').name('Fill Light Color').onChange((value) => this.directionalLight2.color.set(value));
    lighting.add(this.lightingParams, 'directional2Intensity', 0.1, 10, 0.01).name('Fill Light Intensity').onChange((value) => { this.directionalLight2.intensity = value; });
    lighting.add(this.shadowCameraHelper, 'visible').name('Show Shadow Camera');
  }

  update(delta) { this.mouseTrail.update(delta); }

  destroy() {
    this.mouseTrail.destroy();
    this.scene.remove(this.instancedMesh, this.ambientLight, this.directionalLight, this.directionalLight2, this.shadowCameraHelper);
    this.geometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.directionalLight.shadow.map?.dispose();
  }
}
