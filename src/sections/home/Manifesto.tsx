import { Sticker } from '@/components/brand/Sticker';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { manifesto } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import styles from './Manifesto.module.css';

/** Manifiesto del Manual de Marca sobre una foto de campaña a sangre. El texto entra línea a línea una vez. */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !statement.current) return;
      SplitText.create(statement.current, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 105,
            duration: 0.9,
            ease: EASE.out,
            stagger: 0.08,
            scrollTrigger: { trigger: statement.current, start: 'top 85%', once: true },
          }),
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.section} data-theme="dark" aria-labelledby="manifesto-title">
      <ImageReveal className={styles.media} from="bottom" parallax={10}>
        <CampaignImage photo={manifesto.photo} sizes="100vw" decorative focus="30% 50%" />
      </ImageReveal>
      <div className={`container ${styles.content}`}>
        <div className={styles.head}>
          <h2 id="manifesto-title" className="eyebrow">
            {manifesto.title} · {manifesto.movement}
          </h2>
          <Sticker mark="mascot" rotate={7} className={styles.sticker} />
        </div>
        <p ref={statement} className={styles.statement}>
          {manifesto.statement} <span className={styles.accent}>{manifesto.accent}</span>
        </p>
      </div>
    </section>
  );
}
