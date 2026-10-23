import { afterEach, describe, expect, it, vi } from 'vitest';
import { canAttemptHoverGL, holdCssSwap, isHoverPointer, isSoftwareRenderer, releaseCssSwap } from './capabilities';

const env = (queries: Record<string, boolean>, webgl = true) => ({
  matchMedia: (query: string) => ({ matches: queries[query] ?? false }),
  WebGLRenderingContext: webgl ? function WebGLRenderingContext() {} : undefined,
});

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

describe('canAttemptHoverGL', () => {
  it('sí con puntero fino, sin movimiento reducido y con WebGL', () => {
    expect(canAttemptHoverGL(env({ [FINE]: true }))).toBe(true);
  });

  it('no en táctil / puntero grueso', () => {
    expect(canAttemptHoverGL(env({ [FINE]: false }))).toBe(false);
  });

  it('no con prefers-reduced-motion', () => {
    expect(canAttemptHoverGL(env({ [FINE]: true, [REDUCED]: true }))).toBe(false);
  });

  it('no sin WebGL ni sin matchMedia (SSR)', () => {
    expect(canAttemptHoverGL(env({ [FINE]: true }, false))).toBe(false);
    expect(canAttemptHoverGL({})).toBe(false);
    expect(canAttemptHoverGL(undefined)).toBe(false);
  });
});

describe('isSoftwareRenderer', () => {
  it('detecta SwiftShader, llvmpipe y similares', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });
});

describe('isHoverPointer', () => {
  it('ratón y lápiz sí; táctil no', () => {
    expect(isHoverPointer({ pointerType: 'mouse' })).toBe(true);
    expect(isHoverPointer({ pointerType: 'pen' })).toBe(true);
    expect(isHoverPointer({ pointerType: 'touch' })).toBe(false);
  });
});

describe('retención del fundido CSS', () => {
  afterEach(() => vi.useRealTimers());

  it('se suelta sola pasado el plazo, y una retención nueva no la suelta la anterior', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    holdCssSwap(host, 100);
    expect(host.hasAttribute('data-gl-pending')).toBe(true);
    vi.advanceTimersByTime(60);
    holdCssSwap(host, 100); // renueva
    vi.advanceTimersByTime(60); // vence el primer temporizador: no debe soltar la renovada
    expect(host.hasAttribute('data-gl-pending')).toBe(true);
    vi.advanceTimersByTime(60);
    expect(host.hasAttribute('data-gl-pending')).toBe(false);
  });

  it('releaseCssSwap sin token suelta siempre; con token ajeno, no', () => {
    const host = document.createElement('div');
    holdCssSwap(host, 10_000);
    releaseCssSwap(host, 'otro');
    expect(host.hasAttribute('data-gl-pending')).toBe(true);
    releaseCssSwap(host);
    expect(host.hasAttribute('data-gl-pending')).toBe(false);
    expect(host.dataset.glPendingToken).toBeUndefined();
  });

  it('ignora nodos que no son elementos HTML', () => {
    expect(() => holdCssSwap(null)).not.toThrow();
  });
});
