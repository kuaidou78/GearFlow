import mitt from 'mitt';

export default class Sizes {
  constructor(getSize = () => ({ width: window.innerWidth, height: window.innerHeight })) {
    this.emitter = mitt();
    this.getSize = getSize;
    const size = this.getSize();
    this.width = Math.max(1, size.width);
    this.height = Math.max(1, size.height);
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.onResize = () => this.refresh();
    window.addEventListener('resize', this.onResize);
  }

  refresh() {
    const size = this.getSize();
    this.width = Math.max(1, size.width);
    this.height = Math.max(1, size.height);
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.emitter.emit('resize');
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.emitter.all.clear();
  }
}
