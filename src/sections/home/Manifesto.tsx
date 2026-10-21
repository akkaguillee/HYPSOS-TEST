import { Monogram } from '@/components/brand/BrandVector';
import { Reveal } from '@/components/motion/Reveal';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import { manifesto } from '@/content/campaign';
import styles from './Manifesto.module.css';

const { pillars } = manifesto;

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
              {manifesto.title}
            </h2>
            <Monogram className={styles.monogram} />
            <p className={styles.greek}>
              <strong lang="grc">ὕψος</strong>
              Del griego: altura, elevación.
            </p>
          </Reveal>
          <div>
            <p ref={statement} className={styles.statement}>
              {manifesto.statement} <span className={styles.accent}>{manifesto.accent}</span>
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
