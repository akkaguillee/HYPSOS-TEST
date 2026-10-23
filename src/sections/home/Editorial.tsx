import { CampaignImage } from '@/components/media/CampaignImage';
import { SprayMark } from '@/components/graffiti/SprayMark';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { ButtonLink } from '@/components/ui/Button';
import { editorial } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { campaignPhotos } from '@shared/campaign';
import { paths } from '@shared/routes';
import { useRef } from 'react';
import styles from './Editorial.module.css';

/**
 * Lookbook: titular monumental («Above ordinary.») que se cruza con dos fotos de looks completos.
 * Las fotos tapan parte de las letras a propósito; cada capa se desplaza a distinta velocidad.
 */
export function Editorial() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const scroll = { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 };
      gsap.fromTo(q(`.${styles.wordA}`), { xPercent: -2 }, { xPercent: 5, ease: 'none', scrollTrigger: scroll });
      gsap.fromTo(q(`.${styles.wordB}`), { xPercent: 6 }, { xPercent: -4, ease: 'none', scrollTrigger: scroll });
      gsap.fromTo(q(`.${styles.figA}`), { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: scroll });
      gsap.fromTo(q(`.${styles.figB}`), { yPercent: -4 }, { yPercent: 10, ease: 'none', scrollTrigger: scroll });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="editorial" className={`section ${styles.section}`} data-theme="light" aria-labelledby="editorial-title">
      <div className="container">
        <p className="eyebrow">
          <Scramble>{editorial.kicker}</Scramble>
        </p>
        <div className={styles.stage}>
          <SprayMark variant="crown" className={styles.crown} />
          <h2 id="editorial-title" className={styles.title}>
            <span className={styles.wordA}>Above</span>
            <span className={styles.wordB}>ordinary.</span>
          </h2>
          <figure className={styles.figA}>
            <ImageReveal className={styles.frame} from="left">
              <CampaignImage photo={campaignPhotos.lookTee} sizes="(min-width: 1024px) 30vw, 60vw" focus="50% 30%" />
            </ImageReveal>
            <figcaption className={styles.caption}>Look 01 · Camiseta oversize + cargo</figcaption>
          </figure>
          <figure className={styles.figB}>
            <ImageReveal className={styles.frame} from="right">
              <CampaignImage photo={campaignPhotos.lookHoodie} sizes="(min-width: 1024px) 24vw, 46vw" focus="50% 30%" />
            </ImageReveal>
            <figcaption className={styles.caption}>Look 02 · Hoodie + jogger</figcaption>
          </figure>
        </div>
        <div className={styles.foot}>
          <p className={styles.text}>{editorial.text}</p>
          <ButtonLink to={paths.collection('drop-01-ascenso')} variant="outline">
            Comprar los looks
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
