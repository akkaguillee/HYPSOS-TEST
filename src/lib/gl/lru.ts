/**
 * Caché LRU mínima (Map conserva el orden de inserción: la primera clave es la menos usada).
 * `onEvict` libera el recurso expulsado (p. ej. `gl.deleteTexture`).
 */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(
    readonly capacity: number,
    private readonly onEvict?: (value: V, key: K) => void,
  ) {
    if (capacity < 1) throw new RangeError('La capacidad de la caché debe ser al menos 1');
  }

  get size(): number {
    return this.map.size;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  /** Lee y marca como usada recientemente. */
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /** Lee sin alterar el orden. */
  peek(key: K): V | undefined {
    return this.map.get(key);
  }

  set(key: K, value: V): this {
    const previous = this.map.get(key);
    if (this.map.has(key)) {
      this.map.delete(key);
      if (previous !== value) this.onEvict?.(previous as V, key);
    }
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K;
      const evicted = this.map.get(oldest) as V;
      this.map.delete(oldest);
      this.onEvict?.(evicted, oldest);
    }
    return this;
  }

  delete(key: K): boolean {
    if (!this.map.has(key)) return false;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.onEvict?.(value, key);
    return true;
  }

  /** Vacía la caché. Con `release = false` no llama a `onEvict` (p. ej. tras perder el contexto WebGL). */
  clear(release = true): void {
    if (release) for (const [key, value] of this.map) this.onEvict?.(value, key);
    this.map.clear();
  }

  keys(): K[] {
    return [...this.map.keys()];
  }
}
