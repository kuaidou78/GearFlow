import * as THREE from 'three';

export default class Camera {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.sizes = this.orchestrator.sizes;
    this.scene = this.orchestrator.scene;
    this.radius = 12;
    this.alphaRange = Math.PI * 0.03;
    this.betaRange = Math.PI * 0.05;
    this.mouse = new THREE.Vector2(0, 0);
    this.lerpedMouse = new THREE.Vector2(0, 0);
    this.instance = new THREE.PerspectiveCamera(40, this.sizes.width / this.sizes.height, 0.1, 200);
    this.updatePosition(0, 0);
    this.scene.add(this.instance);
    this.pointerTarget = this.orchestrator.pointerTarget;
    this.pointerRect = this.pointerTarget.getBoundingClientRect();
    this.onResize = () => { this.pointerRect = this.pointerTarget.getBoundingClientRect(); };
    this.orchestrator.sizes.emitter.on('resize', this.onResize);
    this.onMouseMove = (event) => {
      this.mouse.x = ((event.clientX - this.pointerRect.left) / this.pointerRect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - this.pointerRect.top) / this.pointerRect.height) * 2 + 1;
    };
    this.pointerTarget.addEventListener('mousemove', this.onMouseMove);
    this.setGUI();
  }

  updatePosition(mouseX, mouseY) {
    const alpha = mouseY * this.alphaRange;
    const beta = mouseX * this.betaRange;
    this.instance.position.set(
      -this.radius * Math.cos(alpha) * Math.sin(beta),
      this.radius * Math.cos(alpha) * Math.cos(beta),
      this.radius * Math.sin(alpha)
    );
    this.instance.up.set(0, 0, -1);
    this.instance.lookAt(0, 0, 0);
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    this.lerpedMouse.x += (this.mouse.x - this.lerpedMouse.x) * 0.04;
    this.lerpedMouse.y += (this.mouse.y - this.lerpedMouse.y) * 0.04;
    this.updatePosition(this.lerpedMouse.x, this.lerpedMouse.y);
  }

  setGUI() {
    const gui = this.orchestrator.debug.ui;
    if (!gui) return;
    gui.addFolder('Camera').add(this, 'radius', 10, 20, 0.01).name('Distance');
  }

  destroy() {
    this.pointerTarget.removeEventListener('mousemove', this.onMouseMove);
    this.orchestrator.sizes.emitter.off('resize', this.onResize);
    this.scene.remove(this.instance);
  }
}
