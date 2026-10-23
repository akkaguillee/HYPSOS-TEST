/** Tipos de dominio compartidos entre la web y la API. Los importes siempre en céntimos. */

export type CategoryHandle =
  | 'camisetas'
  | 'sudaderas'
  | 'pantalones'
  | 'gorras'
  | 'accesorios'
  | '3d'
  | 'stickers';

export type Silhouette =
  | 'tee'
  | 'longsleeve'
  | 'hoodie'
  | 'pants'
  | 'shorts'
  | 'cap'
  | 'beanie'
  | 'tote'
  | 'socks'
  | 'keychain'
  | 'sticker'
  | 'blindbox';

export type ProductBadge = 'nuevo' | 'edicion-limitada';

export type SizeGuideType = 'tops' | 'bottoms';

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export type MediaView = 'front' | 'back' | 'detail';

/** Imagen real del producto (fotografía o render oficial). */
export interface ProductImage {
  type: 'image';
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Color al que pertenece la imagen. Sin valor = válida para todos. */
  colorId?: string;
}

/**
 * Mockup digital 2D generado con `pnpm mockups` (scripts/mockups): una imagen por color y vista
 * hasta que existan fotografías reales. Se presenta siempre como mockup, nunca como foto.
 */
export interface ProductMockup {
  type: 'mockup';
  view: MediaView;
}

export type ProductMedia = ProductImage | ProductMockup;

export type PublicationStatus = 'published' | 'draft';

export interface Product {
  id: string;
  handle: string;
  /** Referencia comercial (base del SKU de cada variante). */
  code: string;
  name: string;
  status: PublicationStatus;
  category: CategoryHandle;
  collections: string[];
  tags: string[];
  /** Precio en céntimos, IVA incluido, en la moneda de la tienda. */
  price: number;
  compareAtPrice?: number;
  shortDescription: string;
  description: string;
  details: string[];
  composition: string;
  care: string[];
  fit?: string;
  colors: ColorOption[];
  sizes: string[];
  /**
   * Stock inicial por variante (clave `${colorId}:${size}`). Solo siembra la base de
   * datos la primera vez que aparece una variante: después, el stock real vive en la BD.
   */
  initialStock: Record<string, number>;
  badges: ProductBadge[];
  /** Fecha de lanzamiento ISO (ordenación por novedades). */
  releasedAt: string;
  /** Posición en el orden "destacados" (menor = antes). */
  featuredRank: number;
  silhouette: Silhouette;
  sizeGuide?: SizeGuideType;
  media: ProductMedia[];
  /** Tirada total si es edición limitada. */
  editionSize?: number;
  /** Vista previa digital para stickers y gráficos (recurso oficial de marca). */
  artwork?: 'mascot' | 'star' | 'wordmark' | 'monogram';
}

/** Consulta de stock disponible por SKU de variante (`productId:colorId:size`). */
export type StockLookup = (sku: string) => number | undefined;

export interface Category {
  handle: CategoryHandle;
  name: string;
  /** Nombre singular para breadcrumbs y metadatos. */
  singular: string;
  description: string;
  silhouette: Silhouette;
}

export interface Collection {
  handle: string;
  name: string;
  kicker: string;
  tagline: string;
  description: string;
  releasedAt: string;
  /** Prenda que representa la colección en tarjetas y menús (dirección de arte, no automática). */
  cover: { handle: string; colorId: string; view: MediaView };
}

export interface CartLineInput {
  productId: string;
  colorId: string;
  size: string;
  quantity: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  /** Plazo de entrega tal y como lo confirma el operador logístico. */
  description: string;
  price: number;
  /** Si se indica, el método es gratuito a partir de este subtotal (céntimos). */
  freeFrom?: number;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
  /** IVA incluido en el total (informativo). */
  taxIncluded: number;
  freeShippingApplied: boolean;
}
