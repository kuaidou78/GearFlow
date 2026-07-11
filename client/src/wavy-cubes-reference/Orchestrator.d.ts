export default class Orchestrator {
  constructor(canvas: HTMLCanvasElement, options?: {
    theme?: {
      background?: string;
      base?: string;
      highlight?: string;
      ambientIntensity?: number;
      fillIntensity?: number;
      exposure?: number;
      vignetteRadius?: number;
      vignetteSoftness?: number;
      vignetteStrength?: number;
      rgbShift?: number;
    };
    pointerTarget?: HTMLElement;
    getSize?: () => { width: number; height: number };
  });
  initialize(): Promise<void>;
  resize(): void;
  destroy(): void;
}
