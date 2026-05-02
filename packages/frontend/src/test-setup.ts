import '@testing-library/jest-dom/vitest';

// Mock requestAnimationFrame to prevent d3 SVG transform errors in jsdom
// jsdom doesn't implement SVGElement.transform.baseVal which d3 transitions use
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}
