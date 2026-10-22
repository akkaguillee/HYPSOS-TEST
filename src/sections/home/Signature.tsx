import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { climbSystem, signature } from '@/content/campaign';
import styles from './Signature.module.css';

/** El detalle firma (trabilla roja) y The Climb System del Manual de Marca. */
export function Signature() {
  return (
    <section className="section" data-theme="light" aria-labelledby="signature-title">
      <div className={`container ${styles.grid}`}>
        <ImageReveal className={styles.media} from="left" parallax={6}>
          <CampaignImage photo={signature.photo} sizes="(min-width: 1024px) 44vw, 100vw" />
        </ImageReveal>
        <div className={styles.copy}>
          <p className="eyebrow">{signature.kicker}</p>
          <SplitHeadline id="signature-title" className="t-display">
            {signature.title}
          </SplitHeadline>
          <p className={styles.text}>{signature.text}</p>
          <ol className={styles.system} aria-label="The Climb System">
            {climbSystem.map((item, index) => (
              <Reveal as="li" key={item.code} className={styles.item} index={index}>
                <span className={styles.code}>{item.code}</span>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemText}>{item.text}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
