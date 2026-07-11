import * as THREE from 'three';
import Debug from './Utils/Debug.js';
import Sizes from './Utils/Sizes.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Stage from './Stage.js';

export default class Orchestrator {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.theme = options.theme ?? {};
    this.pointerTarget = options.pointerTarget ?? canvas;
    this.getSize = options.getSize ?? (() => ({ width: window.innerWidth, height: window.innerHeight }));
    this.destroyed = false;
  }

  async initialize() {
    this.debug = new Debug();
    await this.debug.initialize();
    this.sizes = new Sizes(this.getSize);
    this.scene = new THREE.Scene();
    this.camera = new Camera(this);
    this.renderer = new Renderer(this);
    this.clock = new THREE.Timer();
    this.clock.connect(document);
    this.stage = new Stage(this);
    await this.initializeStats();
    this.onResize = () => {
      this.camera.resize();
      this.renderer.resize();
    };
    this.sizes.emitter.on('resize', this.onResize);
    this.renderer.instance.setAnimationLoop(this.animate.bind(this));
  }

  async initializeStats() {
    if (!this.debug.active) return;
    const { default: Stats } = await import('stats.js');
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    document.body.appendChild(this.stats.dom);
  }

  resize() {
    this.sizes.refresh();
  }

  animate() {
    if (this.destroyed) return;
    this.clock.update();
    const delta = this.clock.getDelta();
    this.stats?.begin();
    this.camera.update();
    this.stage.update(delta);
    this.renderer.update();
    this.stats?.end();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.renderer?.instance.setAnimationLoop(null);
    this.sizes?.emitter.off('resize', this.onResize);
    this.clock?.disconnect();
    this.clock?.dispose();
    this.stage?.destroy();
    this.camera?.destroy();
    this.renderer?.destroy();
    this.sizes?.destroy();
    this.debug?.destroy();
    this.stats?.dom.remove();
  }
}
