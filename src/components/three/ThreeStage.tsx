import { IconButton } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { Move3d, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ViewerHandle } from './engine';
import styles from './ThreeStage.module.css';

type Source = { kind: 'monogram' } | { kind: 'model'; src: string };

interface ThreeStageProps {
  source: Source;
  /** Imagen fija: se muestra mientras carga y si el dispositivo no admite WebGL. */
  poster: ReactNode;
  label: string;
  className?: string;
  hint?: string;
}

/**
 * Lienzo 3D con carga diferida: three.js solo se descarga cuando el bloque está cerca de la
 * pantalla. Si WebGL no está disponible o el modelo falla, se queda la imagen de respaldo.
 */
export function ThreeStage({ source, poster, label, className, hint = 'Arrastra para girar' }: ThreeStageProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const handle = useRef<ViewerHandle | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const reduced = useReducedMotion();
  const sourceKey = source.kind === 'model' ? source.src : 'monogram';

  useEffect(() => {
    const element = root.current;
    const host = canvasHost.current;
    if (!element || !host) return;
    let cancelled = false;

    const start = async () => {
      setState('loading');
      try {
        const engine = await import('./engine');
        if (cancelled) return;
        if (!engine.webglAvailable()) {
          setState('fallback');
          return;
        }
        const options = { autoRotate: !reduced, onReady: () => !cancelled && setState('ready') };
        if (source.kind === 'monogram') {
          const { monogramVector } = await import('@/assets/brand/monogram');
          if (cancelled) return;
          handle.current = engine.mountMonogram(host, monogramVector, options);
        } else {
          const viewer = await engine.mountModel(host, source.src, options);
          if (cancelled) viewer.dispose();
          else handle.current = viewer;
        }
      } catch {
        if (!cancelled) setState('fallback');
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void start();
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      handle.current?.dispose();
      handle.current = null;
    };
    // `source` se identifica por `sourceKey` para no remontar el visor en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, reduced]);

  const interactive = state === 'ready';

  return (
    <div
      ref={root}
      className={cn(styles.stage, className)}
      data-ready={interactive}
      role={interactive ? 'group' : 'img'}
      aria-roledescription={interactive ? 'visor 3D' : undefined}
      aria-label={interactive ? `${label}. Arrastra o usa las flechas del teclado para girarlo.` : label}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className={styles.poster} aria-hidden={interactive || undefined}>
        {poster}
      </div>
      <div ref={canvasHost} className={styles.canvas} />
      {interactive && (
        <>
          <span className={styles.hint} aria-hidden="true">
            <Move3d aria-hidden="true" />
            {hint}
          </span>
          <IconButton label="Restablecer vista 3D" className={styles.reset} onClick={() => handle.current?.reset()}>
            <RotateCcw aria-hidden="true" />
          </IconButton>
        </>
      )}
    </div>
  );
}
