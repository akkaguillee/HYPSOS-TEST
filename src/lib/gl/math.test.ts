import { describe, expect, it } from 'vitest';
import {
  canvasDpr,
  coverTransform,
  cubicBezier,
  originReach,
  parseCssColor,
  parseCssScale,
  perspectiveFor,
  pointerToUv,
  remainingDuration,
  rippleAmplitude,
  textureTargetSize,
  tiltAngles,
} from './math';

describe('coverTransform (object-fit: cover centrado)', () => {
  it('no recorta cuando caja e imagen tienen la misma proporción (4:5)', () => {
    expect(coverTransform(327, 408.75, 960, 1200)).toEqual([1, 1, 0, 0]);
  });

  it('caja más ancha: recorta arriba y abajo por igual', () => {
    const [sx, sy, ox, oy] = coverTransform(1000, 500, 1000, 1000);
    expect(sx).toBe(1);
    expect(sy).toBeCloseTo(0.5);
    expect(ox).toBe(0);
    expect(oy).toBeCloseTo(0.25);
  });

  it('caja más alta: recorta a los lados y el centro de la caja es el centro de la imagen', () => {
    const [sx, sy, ox, oy] = coverTransform(567, 717, 960, 1200);
    expect(sy).toBe(1);
    expect(sx).toBeCloseTo((567 / 717) / 0.8, 6);
    expect(0.5 * sx + ox).toBeCloseTo(0.5, 6);
    expect(oy).toBe(0);
  });

  it('valores degenerados → identidad', () => {
    expect(coverTransform(0, 100, 10, 10)).toEqual([1, 1, 0, 0]);
  });
});

describe('textureTargetSize', () => {
  it('pinta 1:1 con los píxeles del dispositivo y nunca supera el original', () => {
    expect(textureTargetSize(327, 408.75, 480, 600, 1)).toEqual({ width: 327, height: 409 });
    expect(textureTargetSize(327, 408.75, 480, 600, 2)).toEqual({ width: 480, height: 600 });
  });

  it('con recorte lateral la textura cubre la parte visible a resolución completa', () => {
    // Caja 400×1000 sobre imagen 4:5: se ve la mitad central del ancho a 400 px → 800 texels de ancho total.
    expect(textureTargetSize(400, 1000, 1600, 2000, 1)).toEqual({ width: 800, height: 1000 });
    // Caja más ancha que la imagen: recorta arriba/abajo; el ancho completo ocupa la caja.
    expect(textureTargetSize(500, 500, 800, 1000, 1)).toEqual({ width: 500, height: 625 });
  });
});

describe('canvasDpr', () => {
  it('limita a 2 y usa 1 con renderizado por software', () => {
    expect(canvasDpr(3)).toBe(2);
    expect(canvasDpr(1.5)).toBe(1.5);
    expect(canvasDpr(0)).toBe(1);
    expect(canvasDpr(2, true)).toBe(1);
  });
});

describe('puntero e inclinación', () => {
  it('convierte el puntero a uv de la caja', () => {
    expect(pointerToUv(150, 300, { left: 100, top: 100, width: 200, height: 400 })).toEqual([0.25, 0.5]);
  });

  it('centro sin inclinación; esquinas al máximo con el lado del cursor hundido', () => {
    expect(tiltAngles(0.5, 0.5, 6)).toEqual({ rx: 0, ry: 0 });
    expect(tiltAngles(1, 0, 6)).toEqual({ rx: 6, ry: 6 });
    expect(tiltAngles(0, 1, 6)).toEqual({ rx: -6, ry: -6 });
    // Fuera de la caja se recorta al máximo.
    expect(tiltAngles(3, -2, 3)).toEqual({ rx: 3, ry: 3 });
  });

  it('perspectiva proporcional al tamaño con mínimo', () => {
    expect(perspectiveFor(327, 409, 2.4, 800)).toBe(982);
    expect(perspectiveFor(100, 120, 2.4, 800)).toBe(800);
  });
});

describe('originReach', () => {
  it('desde una esquina llega a la opuesta; desde el centro, a cualquiera', () => {
    expect(originReach(0, 0, 0.8)).toBeCloseTo(Math.hypot(1, 1.25));
    expect(originReach(0.5, 0.5, 0.8)).toBeCloseTo(Math.hypot(0.5, 0.625));
  });
});

describe('estela', () => {
  it('no emite por debajo del umbral y satura en 1', () => {
    expect(rippleAmplitude(0.5)).toBe(0);
    expect(rippleAmplitude(Number.NaN)).toBe(0);
    expect(rippleAmplitude(1.2)).toBeGreaterThan(0.2);
    expect(rippleAmplitude(50)).toBe(1);
  });
});

describe('remainingDuration', () => {
  it('es proporcional a lo que falta, con mínimo, y 0 si ya está', () => {
    expect(remainingDuration(0, 1, 0.9)).toBeCloseTo(0.9);
    expect(remainingDuration(0.5, 0, 0.9)).toBeCloseTo(0.45);
    expect(remainingDuration(0.95, 1, 0.9)).toBe(0.3);
    expect(remainingDuration(1, 1, 0.9)).toBe(0);
  });
});

describe('cubicBezier', () => {
  it('coincide con los extremos y con curvas conocidas', () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.37)).toBeCloseTo(0.37, 5);
    const easeOut = cubicBezier(0.22, 1, 0.36, 1);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    // --ease-out: rápida al principio.
    expect(easeOut(0.2)).toBeGreaterThan(0.6);
    const ease = cubicBezier(0.25, 0.1, 0.25, 1); // `ease` de CSS
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
  });

  it('es monótona para curvas de easing habituales', () => {
    const liquid = cubicBezier(0.55, 0.06, 0.12, 1);
    let previous = 0;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const value = liquid(t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });
});

describe('lectura de estilos calculados', () => {
  it('escala de un transform', () => {
    expect(parseCssScale('none')).toBe(1);
    expect(parseCssScale('matrix(1.035, 0, 0, 1.035, 0, 0)')).toBeCloseTo(1.035);
    expect(parseCssScale('matrix3d(1.02, 0, 0, 0, 0, 1.02, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')).toBeCloseTo(1.02);
    expect(parseCssScale('rotate(3deg)')).toBe(1);
  });

  it('color de fondo opaco en 0–1; transparente → null', () => {
    expect(parseCssColor('rgb(236, 233, 227)')).toEqual([236 / 255, 233 / 255, 227 / 255]);
    expect(parseCssColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseCssColor('rgb(10 20 30 / 50%)')).toBeNull();
    expect(parseCssColor('rgb(10 20 30)')).toEqual([10 / 255, 20 / 255, 30 / 255]);
    expect(parseCssColor('transparent')).toBeNull();
  });
});
