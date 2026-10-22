import { Sticker } from '@/components/brand/Sticker';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { limited } from '@/content/campaign';
import styles from './LimitedDrop.module.css';

/** La señal roja de la página: banda en HYPSOS Red con la cápsula de tirada corta. La foto sobresale de la banda. */
export function LimitedDrop() {
  return (
    <section className={`section ${styles.section}`} data-theme="red" aria-labelledby="limited-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className="eyebrow">{limited.kicker}</p>
          <SplitHeadline id="limited-title" className={styles.title}>
            {limited.title}
          </SplitHeadline>
          <p className={styles.text}>{limited.text}</p>
          <ButtonLink to={limited.cta.to} size="lg">
            {limited.cta.label}
          </ButtonLink>
        </div>
        <div className={styles.visual}>
          <ImageReveal className={styles.media} from="bottom" parallax={8}>
            <CampaignImage photo={limited.photo} sizes="(min-width: 1024px) 34vw, 80vw" focus="40% 40%" />
          </ImageReveal>
          <Sticker mark="star" color="#d71920" rotate={-8} className={styles.sticker} />
        </div>
      </div>
    </section>
  );
}
