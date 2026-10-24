import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { editorial } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { campaignPhotos } from '@shared/campaign';
import { paths } from '@shared/routes';
import { useRef } from 'react';
import styles from './Editorial.module.css';

/**
 * Lookbook en clave editorial (21 TSI): composición asimétrica alineada a la izquierda, una foto
 * grande de look completo y un retrato en círculo como contrapunto geométrico. Cada capa se mueve
 * a su velocidad con el scroll.
 */
export function Editorial() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const scroll = { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 };
      gsap.fromTo(q(`.${styles.figMain}`), { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: scroll });
      gsap.fromTo(q(`.${styles.figCircle}`), { yPercent: 30, rotation: -8 }, { yPercent: -20, rotation: 6, ease: 'none', scrollTrigger: scroll });
      gsap.fromTo(q(`.${styles.figSide}`), { yPercent: -4 }, { yPercent: 12, ease: 'none', scrollTrigger: scroll });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="editorial" className={`section ${styles.section}`} data-theme="light" aria-labelledby="editorial-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className="eyebrow">
            <Scramble>{editorial.kicker}</Scramble>
          </p>
          <SplitHeadline id="editorial-title" className={styles.title}>
            {editorial.title}
          </SplitHeadline>
          <p className={styles.text}>{editorial.text}</p>
          <ButtonLink to={paths.collection('drop-01-ascenso')} variant="outline">
            Comprar los looks
          </ButtonLink>
        </div>

        <figure className={styles.figMain}>
          <ImageReveal className={styles.frame}>
            <CampaignImage photo={campaignPhotos.lookTee} sizes="(min-width: 1024px) 40vw, 92vw" focus="50% 30%" />
          </ImageReveal>
          <figcaption className={styles.caption}>Look 01 / Camiseta oversize + cargo</figcaption>
        </figure>

        <figure className={styles.figCircle}>
          <ImageReveal className={styles.circle}>
            <CampaignImage photo={campaignPhotos.cap} sizes="(min-width: 1024px) 18vw, 40vw" focus="50% 24%" />
          </ImageReveal>
        </figure>

        <figure className={styles.figSide}>
          <ImageReveal className={styles.frame}>
            <CampaignImage photo={campaignPhotos.cargo} sizes="(min-width: 1024px) 22vw, 46vw" focus="50% 55%" />
          </ImageReveal>
          <figcaption className={styles.caption}>Look 02 / Cargo ancho en la escalera</figcaption>
        </figure>
      </div>
    </section>
  );
}
