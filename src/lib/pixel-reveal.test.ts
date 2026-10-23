import { describe, expect, it } from 'vitest';
import { coverSource, random, RESOLVE_STEPS, tileSchedule } from './pixel-reveal';

describe('pixel-reveal: recorte object-fit: cover', () => {
  it('una imagen más ancha que la caja se recorta por los lados según object-position', () => {
    const centered = coverSource(2000, 1000, 500, 500);
    expect(centered).toEqual({ x: 500, y: 0, w: 1000, h: 1000 });
    expect(coverSource(2000, 1000, 500, 500, 0, 0.5).x).toBe(0);
    expect(coverSource(2000, 1000, 500, 500, 1, 0.5).x).toBe(1000);
  });

  it('una imagen más alta que la caja se recorta arriba y abajo y conserva la proporción de la caja', () => {
    const source = coverSource(960, 1280, 400, 200, 0.5, 0.4);
    expect(source.w).toBe(960);
    expect(source.w / source.h).toBeCloseTo(2, 6);
    expect(source.y).toBeCloseTo((1280 - 480) * 0.4, 6);
  });
});

describe('pixel-reveal: orden de las baldosas', () => {
  it('cada baldosa tiene un instante entre 0 y 1 y el barrido va en diagonal', () => {
    const cols = 6;
    const rows = 4;
    const times = tileSchedule(cols, rows, random(3));
    expect(times).toHaveLength(cols * rows);
    times.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    });
    // Esquina superior izquierda antes que la inferior derecha.
    expect(times[0]).toBeLessThan(times[cols * rows - 1]);
  });

  it('el enfoque va de bloques grandes a pequeños', () => {
    for (let i = 1; i < RESOLVE_STEPS.length; i++) expect(RESOLVE_STEPS[i]).toBeLessThan(RESOLVE_STEPS[i - 1]);
  });

  it('la semilla hace el orden reproducible', () => {
    expect(tileSchedule(4, 3, random(9))).toEqual(tileSchedule(4, 3, random(9)));
  });
});
