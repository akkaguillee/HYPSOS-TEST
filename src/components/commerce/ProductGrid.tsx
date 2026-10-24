import { Mascot } from '@/components/brand/BrandVector';
import { CampaignImage } from '@/components/media/CampaignImage';
import { Reveal } from '@/components/motion/Reveal';
import type { CampaignPhoto } from '@shared/campaign';
import { GRID_SIZES } from '@shared/catalog/listing';
import type { Product } from '@shared/types';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  /** Columnas en escritorio (≥1280 px). Móvil 2 y tableta 3 siempre. */
  columns?: 3 | 4;
  /** Número de tarjetas iniciales cargadas con prioridad (sobre el pliegue). */
  priorityCount?: number;
  headingLevel?: 'h2' | 'h3';
  /** En listados de novedades la etiqueta «Nuevo» sobra. */
  hideNewBadge?: boolean;
  /**
   * Pieza editorial que completa la última fila: ocupa exactamente las celdas libres en cada
   * tamaño y desaparece cuando la fila está completa.
   */
  endTile?: ReactNode;
  /** La pieza final se muestra siempre: si la fila está completa, ocupa una fila entera. */
  endTileAlways?: boolean;
}

/** Celdas libres en la última fila con `columns` columnas. */
function freeCells(count: number, columns: number) {
  const rest = count % columns;
  return rest === 0 ? 0 : columns - rest;
}

/**
 * Rejilla única de los listados: 2 columnas en móvil, 3 en tableta y 3 o 4 en escritorio.
 * Sin huecos: si la última fila queda incompleta, `endTile` la remata.
 */
export function ProductGrid({ products, columns = 4, priorityCount = 4, headingLevel, hideNewBadge, endTile, endTileAlways }: ProductGridProps) {
  const sizes = GRID_SIZES[columns];
  const spans = [2, 3, columns].map((cols) => freeCells(products.length, cols) || (endTileAlways ? cols : 0));
  const showEnd = Boolean(endTile) && products.length > 0 && spans.some(Boolean);
  return (
    <ul role="list" className={styles.grid} data-columns={columns}>
      {products.map((product, index) => (
        <Reveal as="li" key={product.id} index={index % columns} variant={index < priorityCount ? 'rise' : 'fade'}>
          <ProductCard product={product} priority={index < priorityCount} sizes={sizes} headingLevel={headingLevel} hideNewBadge={hideNewBadge} />
        </Reveal>
      ))}
      {showEnd && (
        <li
          className={styles.end}
          data-sm={spans[0] || undefined}
          data-md={spans[1] || undefined}
          data-lg={spans[2] || undefined}
          style={{ '--span-sm': spans[0], '--span-md': spans[1], '--span-lg': spans[2] } as CSSProperties}
        >
          {endTile}
        </li>
      )}
    </ul>
  );
}

interface EndTileProps {
  kicker: string;
  title: string;
  /** Con destino, toda la pieza es un enlace con esta llamada a la acción. */
  to?: string;
  cta?: string;
  text?: string;
  /** Nota de procedencia (foto provisional, mockups…). */
  note?: string;
  /** Foto de campaña de fondo (bajo un velo que asegura el contraste). */
  photo?: CampaignPhoto;
  focus?: string;
  /** `brand`: negro con el lema. `lab`: escenario gris con la mascota a gran tamaño. */
  variant?: 'brand' | 'lab';
}

/**
 * Pieza editorial para `endTile`: negro de marca con un lema y un enlace, o el escenario del
 * laboratorio 3D. Escala su tipografía con el ancho que ocupa (consultas de contenedor).
 */
export function EndTile({ kicker, title, to, cta, text, note, photo, focus, variant = 'brand' }: EndTileProps) {
  const content = (
    <>
      {photo && (
        <span className={styles.endMedia} aria-hidden="true">
          <CampaignImage photo={photo} sizes="(min-width: 768px) 50vw, 100vw" focus={focus} decorative />
        </span>
      )}
      <span className={styles.endKicker}>{kicker}</span>
      <span className={styles.endTitle}>{title}</span>
      {text && <span className={styles.endText}>{text}</span>}
      {to && cta && (
        <span className={styles.endLink}>
          <span className={styles.endLinkText}>{cta}</span>
          <ArrowRight aria-hidden="true" />
        </span>
      )}
      {note && <span className={styles.endCredit}>{note}</span>}
      {!photo && variant === 'brand' && <Mascot className={styles.endSticker} />}
      {variant === 'lab' && <Mascot className={styles.labSticker} />}
    </>
  );
  return to ? (
    <Link to={to} className={styles.endTile} data-theme="dark" data-variant={variant} viewTransition>
      {content}
    </Link>
  ) : (
    <div className={styles.endTile} data-theme="dark" data-variant={variant}>
      {content}
    </div>
  );
}
