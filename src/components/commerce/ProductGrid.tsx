import { Reveal } from '@/components/motion/Reveal';
import { GRID_SIZES } from '@shared/catalog/listing';
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
  const sizes = GRID_SIZES[columns];
  return (
    <ul role="list" className={styles.grid} data-columns={columns}>
      {products.map((product, index) => (
        <Reveal as="li" key={product.id} index={index % columns} variant={index < priorityCount ? 'rise' : 'fade'}>
          <ProductCard product={product} priority={index < priorityCount} sizes={sizes} headingLevel={headingLevel} />
        </Reveal>
      ))}
    </ul>
  );
}
