export default class Debug {
  constructor() {
    this.active = window.location.hash === '#debug';
    this.ui = null;
  }

  async initialize() {
    if (!this.active) return;
    const { default: GUI } = await import('lil-gui');
    this.ui = new GUI();
  }

  destroy() {
    this.ui?.destroy();
    this.ui = null;
  }
}
