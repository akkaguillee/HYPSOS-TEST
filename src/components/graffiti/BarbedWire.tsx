import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { useRef, type CSSProperties } from 'react';

const WIDTH = 1200;
const HEIGHT = 64;
const MID = HEIGHT / 2;
const TWIST = 72; // distancia entre cruces de los dos hilos

/** Hilo trenzado: senoide que cruza el centro cada TWIST unidades (el otro hilo va en contrafase). */
function strand(phase: number): string {
  const amplitude = 5;
  let d = `M0 ${MID}`;
  for (let x = 0; x <= WIDTH; x += TWIST / 2) {
    const y = MID + Math.sin((x / TWIST) * Math.PI * 2 + phase) * amplitude;
    const cx = x + TWIST / 4;
    const cy = MID + Math.sin(((x + TWIST / 4) / TWIST) * Math.PI * 2 + phase) * amplitude * 1.3;
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(x + TWIST / 2).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Púas: cada dos cruces, cuatro puntas en aspa, ligeramente irregulares. */
const BARBS = Array.from({ length: Math.floor(WIDTH / (TWIST * 2)) }, (_, index) => {
  const x = TWIST + index * TWIST * 2;
  const tilt = ((index * 37) % 9) - 4;
  return {
    x,
    d: `M${x - 13} ${MID - 15 + tilt}L${x + 13} ${MID + 15 - tilt}M${x + 12} ${MID - 16 - tilt}L${x - 12} ${MID + 16 + tilt}M${x - 4} ${MID - 2}L${x + 5} ${MID + 3}`,
  };
});

const STRAND_A = strand(0);
const STRAND_B = strand(Math.PI);

interface BarbedWireProps {
  className?: string;
  style?: CSSProperties;
  color?: string;
}

/**
 * Alambre de espino (gráfico Y2K de las referencias de la marca), decorativo. Al entrar en
 * pantalla los dos hilos se tienden de izquierda a derecha (DrawSVG) y cada púa salta con un
 * pequeño golpe justo cuando el hilo pasa por ella.
 */
export function BarbedWire({ className, style, color = 'currentColor' }: BarbedWireProps) {
  const root = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const svg = root.current;
      if (!svg || reduced) return;
      const strands = svg.querySelectorAll('[data-strand]');
      const barbs = Array.from(svg.querySelectorAll<SVGPathElement>('[data-barb]'));
      const duration = 1.6;
      const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 88%', once: true } });
      tl.fromTo(strands, { drawSVG: '0%' }, { drawSVG: '100%', duration, ease: 'power2.inOut' }, 0);
      barbs.forEach((barb) => {
        const at = (Number(barb.dataset.x) / WIDTH) * duration * 0.92;
        tl.fromTo(barb, { scale: 0, rotation: -40, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(3)' }, at);
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <svg
      ref={root}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ overflow: 'visible', color, ...style }}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path d={STRAND_A} strokeWidth={2.2} data-strand="" />
      <path d={STRAND_B} strokeWidth={2.2} data-strand="" />
      {BARBS.map((barb) => (
        <path key={barb.x} d={barb.d} strokeWidth={2.4} data-barb="" data-x={barb.x} />
      ))}
    </svg>
  );
}
