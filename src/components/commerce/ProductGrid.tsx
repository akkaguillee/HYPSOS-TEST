import { Reveal } from '@/components/motion/Reveal';
import type { Product } from '@shared/types';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  columns?: 3 | 4;
  /** Número de tarjetas iniciales cargadas con prioridad (sobre el pliegue). */
  priorityCount?: number;
  headingLevel?: 'h2' | 'h3';
}

export function ProductGrid({ products, columns = 4, priorityCount = 4, headingLevel }: ProductGridProps) {
  const sizes = columns === 4 ? '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw' : '(min-width: 768px) 26vw, 48vw';
  return (
    <ul role="list" className={styles.grid} data-columns={columns}>
      {products.map((product, index) => (
        <Reveal as="li" key={product.id} index={index % columns}>
          <ProductCard product={product} priority={index < priorityCount} sizes={sizes} headingLevel={headingLevel} />
        </Reveal>
      ))}
    </ul>
  );
}
