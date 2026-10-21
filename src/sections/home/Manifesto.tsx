import { Monogram } from '@/components/brand/BrandVector';
import { Reveal } from '@/components/motion/Reveal';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import styles from './Manifesto.module.css';

const pillars = [
  { title: 'Identidad', text: 'Cada pieza lleva una idea detrás. Nada de logos por rellenar.' },
  { title: 'Movimiento', text: 'Patrones pensados para entrenar, caminar la ciudad y no parar.' },
  { title: 'Comunidad', text: 'HYPSOS es de quien lo lleva. Los drops se construyen con vosotros.' },
];

/** Pausa editorial en claro: el manifiesto se ilumina palabra a palabra con el scroll. */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !statement.current) return;
      const split = SplitText.create(statement.current, { type: 'words', wordsClass: 'manifesto-word' });
      gsap.fromTo(
        split.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: statement.current, start: 'top 80%', end: 'bottom 45%', scrub: 0.4 },
        },
      );
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={`section ${styles.section}`} data-theme="light" aria-labelledby="manifesto-title">
      <div className="container">
        <div className={styles.grid}>
          <Reveal className={styles.aside}>
            <h2 id="manifesto-title" className="eyebrow">
              Manifiesto
            </h2>
            <Monogram className={styles.monogram} />
            <p className={styles.greek}>
              <strong lang="grc">ὕψος</strong>
              Del griego: altura, elevación.
            </p>
          </Reveal>
          <div>
            <p ref={statement} className={styles.statement}>
              Hecho para quien sube un escalón cada día. Ropa para entrenar, para la calle y para todo lo que pasa entre medias.{' '}
              <span className={styles.accent}>Sin permiso. Sin ruido.</span>
            </p>
            <div className={styles.foot}>
              {pillars.map((pillar, index) => (
                <Reveal key={pillar.title} className={styles.pillar} index={index}>
                  <strong>{pillar.title}</strong>
                  {pillar.text}
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
