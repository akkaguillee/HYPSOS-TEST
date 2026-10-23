import { describe, expect, it, vi } from 'vitest';
import { LruCache } from './lru';

describe('LruCache', () => {
  it('expulsa la menos usada y avisa para liberar el recurso', () => {
    const evicted = vi.fn();
    const cache = new LruCache<string, number>(2, evicted);
    cache.set('a', 1).set('b', 2);
    cache.get('a'); // «a» pasa a ser la más reciente
    cache.set('c', 3);
    expect(cache.keys()).toEqual(['a', 'c']);
    expect(evicted).toHaveBeenCalledWith(2, 'b');
  });

  it('peek no altera el orden', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1).set('b', 2);
    expect(cache.peek('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
  });

  it('reemplazar una clave libera el valor anterior (no el mismo)', () => {
    const evicted = vi.fn();
    const cache = new LruCache<string, object>(3, evicted);
    const first = {};
    cache.set('a', first);
    cache.set('a', first);
    expect(evicted).not.toHaveBeenCalled();
    cache.set('a', {});
    expect(evicted).toHaveBeenCalledWith(first, 'a');
    expect(cache.size).toBe(1);
  });

  it('delete y clear liberan; clear(false) no (contexto WebGL perdido)', () => {
    const evicted = vi.fn();
    const cache = new LruCache<string, number>(12, evicted);
    cache.set('a', 1).set('b', 2).set('c', 3);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('zz')).toBe(false);
    expect(evicted).toHaveBeenCalledTimes(1);
    cache.clear(false);
    expect(evicted).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
    cache.set('d', 4);
    cache.clear();
    expect(evicted).toHaveBeenCalledTimes(2);
  });

  it('rechaza capacidades inválidas', () => {
    expect(() => new LruCache(0)).toThrow(RangeError);
  });
});
