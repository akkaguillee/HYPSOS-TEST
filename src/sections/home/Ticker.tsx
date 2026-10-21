import { Star } from '@/components/brand/BrandVector';
import { Marquee } from '@/components/motion/Marquee';
import styles from './Ticker.module.css';

const messages = ['Drop 01 — Ascenso', 'Ediciones limitadas', 'Envío gratis desde 80 €', 'Hecho para moverse', 'Devoluciones 30 días'];

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
