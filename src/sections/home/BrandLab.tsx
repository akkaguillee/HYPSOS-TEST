import { BrandPanel, type PanelMark, type PanelTone } from '@/components/brand/BrandPanel';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { paths } from '@shared/routes';
import { useRef } from 'react';
import { Link } from 'react-router';
import styles from './BrandLab.module.css';

interface Tile {
  tone: PanelTone;
  mark: PanelMark;
  label: string;
  to: string;
  /** Movimiento de la marca ligado al scroll (de → a). */
  motion: gsap.TweenVars;
  from: gsap.TweenVars;
}

const tiles: Tile[] = [
  { tone: 'red', mark: 'monogram', label: 'Monograma', to: paths.collection('drop-01-ascenso'), from: { xPercent: 8 }, motion: { xPercent: -8 } },
  { tone: 'black', mark: 'star', label: 'Estrella · Stickers', to: paths.collection('stickers'), from: { rotation: -24 }, motion: { rotation: 24 } },
  { tone: 'graphite', mark: 'mascot', label: 'Personaje · Piezas 3D', to: paths.collection('3d'), from: { yPercent: 7 }, motion: { yPercent: -7 } },
  { tone: 'light', mark: 'wordmark', label: 'Logotipo', to: paths.collection('all'), from: { xPercent: -10 }, motion: { xPercent: 10 } },
];

/**
 * Sistema gráfico: las cuatro marcas oficiales en planos de color sólido. Las piezas se
 * descubren con un barrido escalonado y, al hacer scroll, cada marca se desplaza a su ritmo
 * (transform con scrub). Con movimiento reducido todo queda estático.
 */
export function BrandLab() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const cells = q(`.${styles.tile}`);
      gsap.fromTo(
        cells,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          ease: 'power3.inOut',
          stagger: 0.12,
          scrollTrigger: { trigger: q(`.${styles.tiles}`)[0], start: 'top 80%', once: true },
        },
      );
      cells.forEach((cell, index) => {
        const mark = cell.querySelector('[data-brand-mark]');
        if (!mark) return;
        gsap.fromTo(mark, tiles[index].from, {
          ...tiles[index].motion,
          ease: 'none',
          scrollTrigger: { trigger: cell, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        });
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={`section ${styles.section}`} aria-labelledby="lab-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className="eyebrow">Sistema gráfico</p>
          <SplitHeadline id="lab-title" className={`t-display ${styles.title}`}>
            Gráfico. Señal. Identidad.
          </SplitHeadline>
          <Reveal>
            <p className="t-lead">
              El monograma H, la estrella, el personaje y el logotipo forman el sistema gráfico de HYPSOS. Viven en las prendas, en vinilo y en piezas
              para coleccionar.
            </p>
          </Reveal>
          <Reveal className={styles.actions} index={1}>
            <ButtonLink to={paths.collection('stickers')} variant="outline">
              Ver stickers
            </ButtonLink>
            <ButtonLink to={paths.collection('3d')} variant="ghost">
              Piezas 3D
            </ButtonLink>
          </Reveal>
        </div>
        <ul role="list" className={styles.tiles}>
          {tiles.map((tile) => (
            <li key={tile.mark} className={styles.tile}>
              <Link to={tile.to} className={styles.tileLink} viewTransition>
                <BrandPanel tone={tile.tone} mark={tile.mark} className={styles.panel} />
                <span className={styles.tileLabel}>{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
