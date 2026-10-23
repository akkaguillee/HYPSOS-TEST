import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { useRef, type CSSProperties } from 'react';
import { MARKS, type MarkVariant } from './marks';

interface SprayMarkProps {
  variant: MarkVariant;
  /** Color de la pintura. */
  color?: string;
  /** Grosor del trazo (unidades del viewBox); por defecto, el del gesto. */
  stroke?: number;
  /** Con gotas que escurren al acabar el trazo. */
  drips?: boolean;
  /**
   * `scroll`: se pinta al entrar en pantalla · `scrub`: se pinta con el scroll (avanza y retrocede)
   * · `manual`: lo dispara el padre (`onReady`) · `static`: ya pintado.
   */
  trigger?: 'scroll' | 'scrub' | 'manual' | 'static';
  delay?: number;
  /** Duración del trazo completo (sin gotas). */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  onReady?: (timeline: gsap.core.Timeline) => void;
}

/**
 * Trazo de graffiti a espray (decorativo, oculto a lectores de pantalla). El trazo se dibuja con
 * DrawSVG a la velocidad de un brazo —acelera y frena (`hyp.stroke`)— y después, si hay gotas,
 * escurren con gravedad (`hyp.drip`): empiezan despacio, aceleran y se paran al formar la gota.
 * La textura de espray la da el filtro compartido `#hyp-spray` (SprayDefs).
 */
export function SprayMark({ variant, color = 'var(--c-red)', stroke, drips = false, trigger = 'scroll', delay = 0, duration, className, style, onReady }: SprayMarkProps) {
  const root = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const mark = MARKS[variant];
  const width = stroke ?? mark.stroke;
  const dripWidth = Math.max(2.5, width * 0.42);

  useGSAP(
    () => {
      const svg = root.current;
      if (!svg || reduced || trigger === 'static') return;
      const strokes = Array.from(svg.querySelectorAll<SVGPathElement>('[data-stroke]'));
      const runs = Array.from(svg.querySelectorAll<SVGPathElement>('[data-drip]'));
      const beads = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-bead]'));
      const lengths = strokes.map((path) => path.getTotalLength());
      const total = lengths.reduce((sum, value) => sum + value, 0) || 1;
      const time = duration ?? Math.min(1.6, 0.35 + total / 900);

      const tl = gsap.timeline({
        delay,
        paused: trigger === 'manual',
        scrollTrigger:
          trigger === 'scroll'
            ? { trigger: svg, start: 'top 86%', once: true }
            : trigger === 'scrub'
              ? { trigger: svg, start: 'top 85%', end: 'bottom 35%', scrub: 0.8 }
              : undefined,
      });
      gsap.set(strokes, { drawSVG: '0%' });
      gsap.set(runs, { drawSVG: '0%' });
      gsap.set(beads, { scale: 0, transformOrigin: '50% 50%' });
      strokes.forEach((path, index) => {
        tl.to(path, { drawSVG: '100%', duration: (time * lengths[index]) / total, ease: EASE.stroke }, index ? '>-0.04' : 0);
      });
      runs.forEach((run, index) => {
        const at = time * 0.6 + index * 0.18;
        const fall = 1.1 + (index % 3) * 0.35;
        tl.to(run, { drawSVG: '100%', duration: fall, ease: EASE.drip }, at);
        // La gota viaja con la punta del reguero y engorda al pararse.
        tl.fromTo(beads[index], { scale: 0.4, y: -Number(run.dataset.length) }, { scale: 1, y: 0, duration: fall, ease: EASE.drip }, at);
      });
      onReady?.(tl);
    },
    { scope: root, dependencies: [reduced, trigger, variant], revertOnUpdate: true },
  );

  return (
    <svg
      ref={root}
      viewBox={mark.viewBox}
      className={className}
      style={{ overflow: 'visible', ...style }}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <g filter="url(#hyp-spray)" style={{ stroke: color }} strokeLinecap="round" strokeLinejoin="round">
        {mark.paths.map((d, index) => (
          <path key={index} d={d} strokeWidth={width} data-stroke="" />
        ))}
        {drips &&
          mark.drips.map((drip, index) => (
            <g key={index}>
              <path d={`M${drip.x} ${drip.y}L${drip.x} ${drip.y + drip.length}`} strokeWidth={dripWidth} data-drip="" data-length={drip.length} />
              <circle cx={drip.x} cy={drip.y + drip.length} r={dripWidth * 0.75} style={{ fill: color, stroke: 'none' }} data-bead="" />
            </g>
          ))}
      </g>
    </svg>
  );
}
