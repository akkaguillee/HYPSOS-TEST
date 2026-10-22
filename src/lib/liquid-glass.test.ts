import {
  NEUTRAL,
  computeDisplacementField,
  mapCacheKey,
  profileHeight,
  refractionLut,
  refractionOffset,
  resolveGeometry,
  roundedRectSdf,
  supportsSvgBackdropFilter,
} from './liquid-glass';

function pixel(field: ReturnType<typeof computeDisplacementField>, x: number, y: number) {
  const o = (y * field.width + x) * 4;
  return { r: field.data[o], g: field.data[o + 1], b: field.data[o + 2], a: field.data[o + 3] };
}

describe('profileHeight', () => {
  it.each(['squircle', 'circle'] as const)('%s: 0 en el borde, 1 al final del bisel y monótono', (profile) => {
    expect(profileHeight(0, profile)).toBeCloseTo(0);
    expect(profileHeight(1, profile)).toBeCloseTo(1);
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const h = profileHeight(t, profile);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });
});

describe('refracción (Snell)', () => {
  it('no desplaza en la zona plana y es positiva dentro del bisel', () => {
    expect(refractionOffset(1)).toBe(0);
    expect(refractionOffset(0.1)).toBeGreaterThan(0);
  });

  it('un índice mayor desvía más', () => {
    expect(refractionOffset(0.2, 'squircle', 1.8)).toBeGreaterThan(refractionOffset(0.2, 'squircle', 1.3));
  });

  it('la tabla está normalizada (máximo 1) y concentra la deformación cerca del borde', () => {
    const lut = refractionLut('squircle');
    const max = Math.max(...lut);
    expect(max).toBeCloseTo(1);
    expect(lut[lut.length - 1]).toBeCloseTo(0, 3);
    const peak = lut.indexOf(max) / (lut.length - 1);
    expect(peak).toBeLessThan(0.5);
  });
});

describe('resolveGeometry', () => {
  it("'pill' usa la mitad del lado menor", () => {
    expect(resolveGeometry(300, 56, 'pill', 20)).toEqual({ width: 300, height: 56, radius: 28, bezel: 20 });
  });

  it('recorta radio y bisel al tamaño y redondea', () => {
    const g = resolveGeometry(40.4, 40.4, 100, 50);
    expect(g).toEqual({ width: 40, height: 40, radius: 20, bezel: 20 });
  });
});

describe('roundedRectSdf', () => {
  it('es negativo dentro, cero en el borde y positivo fuera', () => {
    expect(roundedRectSdf(0, 0, 100, 50, 10).d).toBeLessThan(0);
    expect(roundedRectSdf(100, 0, 100, 50, 10).d).toBeCloseTo(0);
    expect(roundedRectSdf(120, 0, 100, 50, 10).d).toBeGreaterThan(0);
  });

  it('da la normal exterior en lados y esquinas', () => {
    expect(roundedRectSdf(95, 0, 100, 50, 10)).toMatchObject({ nx: 1, ny: 0 });
    expect(roundedRectSdf(0, -45, 100, 50, 10)).toMatchObject({ nx: 0, ny: -1 });
    const c = roundedRectSdf(98, 48, 100, 50, 10);
    expect(c.nx).toBeCloseTo(Math.SQRT1_2);
    expect(c.ny).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('computeDisplacementField', () => {
  const field = computeDisplacementField({ width: 200, height: 100, radius: 24, bezel: 20 });

  it('tiene el tamaño CSS cuando no supera el límite', () => {
    expect(field.width).toBe(200);
    expect(field.height).toBe(100);
    expect(field.data.length).toBe(200 * 100 * 4);
  });

  it('el centro es neutro (128/128): el contenido de detrás no se deforma', () => {
    expect(pixel(field, 100, 50)).toEqual({ r: NEUTRAL, g: NEUTRAL, b: NEUTRAL, a: 255 });
    expect(pixel(field, 30, 50)).toMatchObject({ r: NEUTRAL, g: NEUTRAL });
  });

  it('el bisel muestrea hacia dentro (R = X, G = Y)', () => {
    const left = pixel(field, 2, 50);
    const right = pixel(field, 197, 50);
    const top = pixel(field, 100, 2);
    const bottom = pixel(field, 100, 97);
    expect(left.r).toBeGreaterThan(NEUTRAL + 40);
    expect(left.g).toBe(NEUTRAL);
    expect(right.r).toBeLessThan(NEUTRAL - 40);
    expect(top.g).toBeGreaterThan(NEUTRAL + 40);
    expect(bottom.g).toBeLessThan(NEUTRAL - 40);
  });

  it('es simétrico respecto al centro', () => {
    for (const [x, y] of [
      [3, 50],
      [10, 10],
      [50, 4],
    ]) {
      const a = pixel(field, x, y);
      const b = pixel(field, 199 - x, 99 - y);
      expect(a.r - NEUTRAL).toBeCloseTo(NEUTRAL - b.r, -0.5);
      expect(a.g - NEUTRAL).toBeCloseTo(NEUTRAL - b.g, -0.5);
    }
  });

  it('en las esquinas la dirección es diagonal', () => {
    const p = pixel(field, 6, 6);
    expect(p.r).toBeGreaterThan(NEUTRAL);
    expect(p.g).toBeGreaterThan(NEUTRAL);
  });

  it('limita la resolución del mapa', () => {
    const big = computeDisplacementField({ width: 1800, height: 900, radius: 24, bezel: 30, maxResolution: 450 });
    expect(big.width).toBe(450);
    expect(big.height).toBe(225);
    expect(big.geometry.width).toBe(1800);
  });

  it('bisel 0 = mapa totalmente neutro', () => {
    const flat = computeDisplacementField({ width: 20, height: 20, radius: 4, bezel: 0 });
    expect(flat.data.every((v, i) => (i % 4 === 3 ? v === 255 : v === NEUTRAL))).toBe(true);
  });
});

describe('mapCacheKey', () => {
  it('incluye w×h×radio×bisel y normaliza tamaños fraccionarios', () => {
    const a = mapCacheKey({ width: 120.2, height: 48, radius: 'pill', bezel: 14 });
    const b = mapCacheKey({ width: 119.9, height: 48, radius: 24, bezel: 14 });
    expect(a).toBe(b);
    expect(a.startsWith('120x48x24x14')).toBe(true);
    expect(mapCacheKey({ width: 120, height: 48, radius: 24, bezel: 12 })).not.toBe(a);
  });
});

describe('supportsSvgBackdropFilter', () => {
  type FakeWin = Window & typeof globalThis;
  const fake = (opts: { ua: string; brands?: string[]; chrome?: boolean; backdrop?: boolean }) =>
    ({
      CSS: { supports: () => opts.backdrop ?? true },
      navigator: {
        userAgent: opts.ua,
        ...(opts.brands ? { userAgentData: { brands: opts.brands.map((brand) => ({ brand, version: '141' })) } } : null),
      },
      ...(opts.chrome ? { chrome: {} } : null),
    }) as unknown as FakeWin;

  const CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

  it('Blink con UA-CH (Chrome, Edge…) → sí', () => {
    expect(supportsSvgBackdropFilter(fake({ ua: CHROME_UA, brands: ['Chromium', 'Google Chrome', 'Not?A_Brand'] }))).toBe(true);
    expect(supportsSvgBackdropFilter(fake({ ua: CHROME_UA, brands: ['Chromium', 'Microsoft Edge'] }))).toBe(true);
  });

  it('Blink sin UA-CH pero con window.chrome → sí', () => {
    expect(supportsSvgBackdropFilter(fake({ ua: CHROME_UA, chrome: true }))).toBe(true);
  });

  it('Safari, Firefox y Chrome iOS (WebKit) → no', () => {
    expect(supportsSvgBackdropFilter(fake({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' }))).toBe(false);
    expect(supportsSvgBackdropFilter(fake({ ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0' }))).toBe(false);
    expect(supportsSvgBackdropFilter(fake({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1', chrome: true }))).toBe(false);
  });

  it('sin backdrop-filter o sin window → no', () => {
    expect(supportsSvgBackdropFilter(fake({ ua: CHROME_UA, brands: ['Chromium'], backdrop: false }))).toBe(false);
    expect(supportsSvgBackdropFilter(null)).toBe(false);
  });
});
