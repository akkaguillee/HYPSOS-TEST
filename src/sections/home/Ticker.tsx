import { Star } from '@/components/brand/BrandVector';
import { Marquee } from '@/components/motion/Marquee';
import { ticker as messages } from '@/content/campaign';
import styles from './Ticker.module.css';

export function Ticker() {
  return (
    <div className={styles.ticker}>
      <Marquee duration={42} label="Novedades de HYPSOS">
        {messages.map((message) => (
          <span key={message} className={styles.item}>
            {message}
            <Star className={styles.star} />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
