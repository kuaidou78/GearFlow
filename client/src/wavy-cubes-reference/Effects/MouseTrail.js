import * as THREE from 'three';

const MAX_TRAIL = 128;

export default class MouseTrail {
  constructor(orchestrator, bounds) {
    this.orchestrator = orchestrator;
    this.camera = this.orchestrator.camera.instance;
    this.canvas = this.orchestrator.canvas;
    this.pointerTarget = this.orchestrator.pointerTarget;
    this.bounds = bounds;
    this.params = { fadeTime: 2.0, trailSpacing: 0.1 };
    this.trail = [];
    this.lastPoint = null;
    this.timeSinceLastMove = 0;
    this.randomPointTimer = 0;
    this.isPlacingRandomPoints = true;
    this.randomPointStrength = 0.8;
    this.mouseCoords = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.rayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds, bounds),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })
    );
    this.rayPlane.rotation.x = -Math.PI / 2;
    this.rayPlane.updateMatrixWorld(true);
    this.trailData = new Float32Array(MAX_TRAIL * 4);
    this.trailTexture = new THREE.DataTexture(this.trailData, MAX_TRAIL, 1, THREE.RGBAFormat, THREE.FloatType);
    this.trailTexture.needsUpdate = true;
    this.uniforms = {
      uTrailTexture: { value: this.trailTexture },
      uTrailCount: { value: 0 },
      uFadeTime: { value: this.params.fadeTime }
    };
    this.rect = this.pointerTarget.getBoundingClientRect();
    this.onResize = () => { this.rect = this.pointerTarget.getBoundingClientRect(); };
    this.orchestrator.sizes.emitter.on('resize', this.onResize);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.pointerTarget.addEventListener('pointermove', this.onPointerMove);
  }

  onPointerMove(event) {
    this.mouseCoords.set(
      ((event.clientX - this.rect.left) / this.rect.width) * 2 - 1,
      -((event.clientY - this.rect.top) / this.rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const hits = this.raycaster.intersectObject(this.rayPlane);
    if (!hits.length) return;
    const { x, z } = hits[0].point;
    let distDelta = 0;
    if (this.lastPoint) {
      const dx = x - this.lastPoint.x;
      const dz = z - this.lastPoint.z;
      distDelta = Math.hypot(dx, dz);
      if (distDelta < this.params.trailSpacing) return;
    }
    if (this.trail.length >= MAX_TRAIL) this.trail.shift();
    this.trail.push({ x, z, age: 0, distDelta });
    this.lastPoint = { x, z };
    this.timeSinceLastMove = 0;
    this.isPlacingRandomPoints = false;
    this.randomPointTimer = 0;
  }

  addRandomPoint() {
    const x = (Math.random() * 0.5 - 0.25) * this.bounds;
    const z = (Math.random() * 0.5 - 0.25) * this.bounds;
    const distDelta = this.randomPointStrength + Math.random() * 0.2;
    if (this.trail.length >= MAX_TRAIL) this.trail.shift();
    this.trail.push({ x, z, age: 0, distDelta });
  }

  update(delta) {
    const expiry = this.params.fadeTime * 4;
    for (let index = this.trail.length - 1; index >= 0; index -= 1) {
      this.trail[index].age += delta;
      if (this.trail[index].age > expiry) this.trail.splice(index, 1);
    }
    this.timeSinceLastMove += delta;
    if (this.timeSinceLastMove >= 3 && !this.isPlacingRandomPoints) {
      this.isPlacingRandomPoints = true;
      this.randomPointTimer = 0;
    }
    if (this.isPlacingRandomPoints) {
      this.randomPointTimer += delta;
      if (this.randomPointTimer >= 1.5) {
        this.addRandomPoint();
        this.randomPointTimer = 0;
      }
    }
    const count = Math.min(this.trail.length, MAX_TRAIL);
    if (count || this.uniforms.uTrailCount.value) {
      this.trailData.fill(0);
      for (let index = 0; index < count; index += 1) {
        const point = this.trail[index];
        const offset = index * 4;
        this.trailData[offset] = point.x;
        this.trailData[offset + 1] = point.z;
        this.trailData[offset + 2] = point.age;
        this.trailData[offset + 3] = point.distDelta;
      }
      this.trailTexture.needsUpdate = true;
      this.uniforms.uTrailCount.value = count;
    }
  }

  destroy() {
    this.pointerTarget.removeEventListener('pointermove', this.onPointerMove);
    this.orchestrator.sizes.emitter.off('resize', this.onResize);
    this.rayPlane.geometry.dispose();
    this.rayPlane.material.dispose();
    this.trailTexture.dispose();
    this.trail.length = 0;
  }
}
