import { Reveal } from '@/components/motion/Reveal';
import type { Product } from '@shared/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductRailProps {
  products: Product[];
  label: string;
  /** Cabecera de la sección; recibe los controles para colocarlos junto al título. */
  header: (controls: ReactNode) => ReactNode;
}

/** Carrusel horizontal nativo (scroll-snap) con flechas en escritorio e indicador de progreso. */
export function ProductRail({ products, label, header }: ProductRailProps) {
  const track = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState({ ratio: 0, visible: 1, atStart: true, atEnd: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      setProgress({
        ratio: max > 0 ? element.scrollLeft / max : 1,
        visible: element.scrollWidth > 0 ? element.clientWidth / element.scrollWidth : 1,
        atStart: element.scrollLeft <= 4,
        atEnd: element.scrollLeft >= max - 4,
      });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  const controls = (
    <div className={styles.controls}>
      <button type="button" className={styles.arrow} onClick={() => scrollByPage(-1)} disabled={progress.atStart} aria-label="Productos anteriores">
        <ArrowLeft aria-hidden="true" />
      </button>
      <button type="button" className={styles.arrow} onClick={() => scrollByPage(1)} disabled={progress.atEnd} aria-label="Productos siguientes">
        <ArrowRight aria-hidden="true" />
      </button>
    </div>
  );

  const barWidth = Math.min(1, progress.visible);

  return (
    <div className={styles.rail}>
      <div className="container">{header(controls)}</div>
      <ul ref={track} role="list" className={styles.track} aria-label={label} tabIndex={0}>
        {products.map((product, index) => (
          <Reveal as="li" key={product.id} index={index}>
            <ProductCard product={product} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 42vw, 72vw" />
          </Reveal>
        ))}
      </ul>
      <div className="container">
        <div className={styles.progress} aria-hidden="true">
          <div
            className={styles.progressBar}
            style={{ width: `${barWidth * 100}%`, transform: `translateX(${progress.ratio * ((1 - barWidth) / barWidth) * 100}%)` }}
          />
        </div>
      </div>
    </div>
  );
}
