import { describe, expect, it } from 'vitest';
import { random, sprayPath } from './spray';

describe('spray: azar determinista', () => {
  it('la misma semilla da la misma secuencia (el dibujo no cambia entre cargas)', () => {
    const a = random(42);
    const b = random(42);
    const seqA = Array.from({ length: 8 }, a);
    const seqB = Array.from({ length: 8 }, b);
    expect(seqA).toEqual(seqB);
    seqA.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });
});

describe('spray: recorrido de la boquilla', () => {
  it('hace una pasada por fila, cruza todo el ancho y acumula distancia', () => {
    const { points, ends, row } = sprayPath(800, 600, 4, 'left', random(1));
    expect(ends).toHaveLength(4);
    expect(row).toBe(150);
    const xs = points.map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(800);
    for (let i = 1; i < points.length; i++) expect(points[i].d).toBeGreaterThanOrEqual(points[i - 1].d);
  });

  it('cubre todas las filas (de arriba abajo, o de abajo arriba con from="bottom")', () => {
    const rowsOf = (from: 'left' | 'bottom') => {
      const { points, ends, row } = sprayPath(800, 600, 4, from, random(3));
      return ends.map((end) => Math.floor(points[end].y / row));
    };
    expect(rowsOf('left')).toEqual([0, 1, 2, 3]);
    expect(rowsOf('bottom')).toEqual([3, 2, 1, 0]);
  });
});
