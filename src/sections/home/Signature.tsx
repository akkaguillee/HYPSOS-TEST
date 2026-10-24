import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { climbSystem, signature } from '@/content/campaign';
import styles from './Signature.module.css';

/**
 * La señal de la página: banda roja a sangre (Shelby) con el detalle firma —la trabilla roja—
 * en un círculo (21 TSI), el titular centrado y The Climb System del Manual en cuatro columnas
 * separadas por líneas finas.
 */
export function Signature() {
  return (
    <section className={`section ${styles.section}`} data-theme="red" aria-labelledby="signature-title">
      <div className={`container ${styles.inner}`}>
        <p className="eyebrow">
          <Scramble>{signature.kicker}</Scramble>
        </p>
        <ImageReveal className={styles.circle}>
          <CampaignImage photo={signature.photo} sizes="(min-width: 1024px) 26vw, 60vw" focus="70% 70%" />
        </ImageReveal>
        <SplitHeadline id="signature-title" className={styles.title}>
          {signature.title}
        </SplitHeadline>
        <p className={styles.text}>{signature.text}</p>
        <ol className={styles.system} aria-label="The Climb System">
          {climbSystem.map((item) => (
            <li key={item.code} className={styles.item}>
              <span className={styles.code}>{item.code}</span>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemText}>{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
