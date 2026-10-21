import { Mascot } from '@/components/brand/BrandVector';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { store } from '@shared/config';
import { useRef } from 'react';
import styles from './Community.module.css';

export function Community() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const wrap = root.current!.querySelector(`.${styles.mascotWrap}`);
      gsap.fromTo(wrap, { '--line-scale': 0 }, { '--line-scale': 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: wrap, start: 'top 75%', once: true } });
      gsap.from(`.${styles.mascot}`, {
        yPercent: 10,
        rotate: -4,
        autoAlpha: 0,
        duration: 1.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: wrap, start: 'top 80%', once: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="section" aria-labelledby="community-title">
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.mascotWrap}>
            <Mascot className={styles.mascot} title="Personaje de HYPSOS" />
          </div>
          <div className={styles.copy}>
            <p className="eyebrow">Comunidad</p>
            <SplitHeadline id="community-title" className="t-display">
              Los nuestros
            </SplitHeadline>
            <Reveal>
              <p className="t-lead">
                Detrás de cada drop hay gente que entrena, crea y se mueve por la ciudad. Enséñanos cómo llevas HYPSOS y forma parte de lo que viene.
              </p>
            </Reveal>
            <Reveal index={1}>
              <p className={styles.handle}>#HYPSOS</p>
            </Reveal>
            <Reveal className={styles.actions} index={2}>
              {store.social.map((network) => (
                <a
                  key={network.id}
                  href={network.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`t-label ${styles.socialLink}`}
                >
                  {network.label}
                </a>
              ))}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
