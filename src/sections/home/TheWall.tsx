import { Sticker } from '@/components/brand/Sticker';
import { BarbedWire } from '@/components/graffiti/BarbedWire';
import { GraffitiTag } from '@/components/graffiti/GraffitiTag';
import { SprayMark } from '@/components/graffiti/SprayMark';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { manifesto } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, slap, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import styles from './TheWall.module.css';

/**
 * El muro: el manifiesto del Manual junto a la foto del chico pintando con espray. Al hacer scroll
 * las palabras del manifiesto se «encienden» una a una (lectura guiada por el scroll), un barrido
 * rojo cruza la sección pintándose con el scroll, el tag «keep climbing» se pinta sobre el muro de
 * la foto y HYPO se pega con un golpe. Cierra un rótulo gigante cortado por el borde.
 */
export function TheWall() {
  const root = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current || !statement.current) return;
      const split = SplitText.create(statement.current, { type: 'words', wordsClass: 'split-word' });
      gsap.fromTo(
        split.words,
        { color: 'rgb(242 240 236 / 0.2)' },
        {
          color: 'rgb(242 240 236 / 1)',
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: statement.current, start: 'top 78%', end: 'bottom 45%', scrub: 0.4 },
        },
      );
      const sticker = root.current.querySelector(`.${styles.stickerSlot}`);
      if (sticker) slap([sticker], { scrollTrigger: { trigger: sticker, start: 'top 80%', once: true } });
      return () => split.revert();
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.section} data-theme="dark" aria-labelledby="wall-title">
      <SprayMark variant="swoosh" trigger="scrub" drips className={styles.swoosh} />
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <h2 id="wall-title" className="eyebrow">
            <Scramble>{`${manifesto.title} · ${manifesto.movement}`}</Scramble>
          </h2>
          <p ref={statement} className={styles.statement}>
            {manifesto.statement}
          </p>
          <div className={styles.accentWrap}>
            <p className={styles.accent}>{manifesto.accent}</p>
            <SprayMark variant="underline" drips className={styles.accentMark} delay={0.2} />
          </div>
        </div>
        <figure className={styles.visual}>
          <ImageReveal className={styles.media} from="right" parallax={8}>
            <CampaignImage photo={manifesto.photo} sizes="(min-width: 1024px) 40vw, 92vw" focus="50% 40%" />
          </ImageReveal>
          <GraffitiTag className={styles.tag} delay={0.9}>
            {manifesto.tag}
          </GraffitiTag>
          <span className={styles.stickerSlot} aria-hidden="true">
            <Sticker mark="mascot" rotate={8} className={styles.sticker} />
          </span>
        </figure>
      </div>
      <BarbedWire className={styles.wire} color="var(--c-red)" />
      <p className={styles.giant} aria-hidden="true">
        {manifesto.movement}
      </p>
    </section>
  );
}
