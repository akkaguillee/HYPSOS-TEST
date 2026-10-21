import { announcements } from '@/content/navigation';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { useEffect, useState } from 'react';
import styles from './AnnouncementBar.module.css';

/** Barra superior con mensajes rotativos. Se pausa al pasar el cursor o enfocar, y con movimiento reducido. */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % announcements.length), 4500);
    return () => window.clearInterval(timer);
  }, [paused, reduced]);

  return (
    <div
      className={styles.bar}
      role="region"
      aria-label="Avisos de la tienda"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {announcements.map((message, position) => (
        <p key={message} className={styles.message} data-active={position === index} aria-hidden={position !== index}>
          {position === index && <span className={styles.dot} aria-hidden="true" />}
          {message}
        </p>
      ))}
    </div>
  );
}
