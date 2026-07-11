import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteRGBShiftShader } from './Effects/VignetteRGBShiftShader.js';

export default class Renderer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.canvas = this.orchestrator.canvas;
    this.sizes = this.orchestrator.sizes;
    this.scene = this.orchestrator.scene;
    this.camera = this.orchestrator.camera;
    this.instance = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = this.orchestrator.theme.exposure ?? 1.95;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFShadowMap;
    this.instance.setClearColor(this.orchestrator.theme.background ?? '#808080');
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    this.composer = new EffectComposer(this.instance);
    this.renderPass = new RenderPass(this.scene, this.camera.instance);
    this.composer.addPass(this.renderPass);
    this.vignetteRGBShiftPass = new ShaderPass(VignetteRGBShiftShader);
    this.vignetteRGBShiftPass.uniforms.shiftAmount.value = this.orchestrator.theme.rgbShift ?? 0.005;
    this.vignetteRGBShiftPass.uniforms.vignetteRadius.value = this.orchestrator.theme.vignetteRadius ?? 0.3;
    this.vignetteRGBShiftPass.uniforms.vignetteSoftness.value = this.orchestrator.theme.vignetteSoftness ?? 0.3;
    this.vignetteRGBShiftPass.uniforms.vignetteStrength.value = this.orchestrator.theme.vignetteStrength ?? 0.5;
    this.composer.addPass(this.vignetteRGBShiftPass);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.setGUI();
  }

  setGUI() {
    const gui = this.orchestrator.debug.ui;
    if (!gui) return;
    const folder = gui.addFolder('Post Processing');
    folder.add(this.vignetteRGBShiftPass.uniforms.shiftAmount, 'value', 0, 0.02, 0.001).name('Shift Amount');
    folder.add(this.vignetteRGBShiftPass.uniforms.vignetteRadius, 'value', 0, 1, 0.01).name('Vignette Radius');
    folder.add(this.vignetteRGBShiftPass.uniforms.vignetteSoftness, 'value', 0, 1, 0.01).name('Vignette Softness');
    folder.add(this.vignetteRGBShiftPass.uniforms.vignetteStrength, 'value', 0, 1, 0.01).name('Vignette Strength');
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    this.composer.setSize(this.sizes.width, this.sizes.height);
    this.composer.setPixelRatio(this.sizes.pixelRatio);
  }

  update() { this.composer.render(); }

  destroy() {
    this.composer.passes.forEach((pass) => pass.dispose?.());
    this.composer.renderTarget1?.dispose();
    this.composer.renderTarget2?.dispose();
    this.instance.dispose();
  }
}
