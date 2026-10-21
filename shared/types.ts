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
  | 'figure'
  | 'object';

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

/** Marcador de posición hasta que existan fotografías reales. */
export interface ProductPlaceholder {
  type: 'placeholder';
  view: MediaView;
}

export type ProductMedia = ProductImage | ProductPlaceholder;

export interface Product {
  id: string;
  handle: string;
  /** Referencia interna (base del SKU). */
  code: string;
  name: string;
  category: CategoryHandle;
  collections: string[];
  /** Precio en céntimos, IVA incluido. */
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
  /** Stock por variante: clave `${colorId}:${size}`. */
  inventory: Record<string, number>;
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
}

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
}

export interface CartLineInput {
  productId: string;
  colorId: string;
  size: string;
  quantity: number;
}

export type ShippingMethodId = 'standard' | 'express';

export interface ShippingMethod {
  id: ShippingMethodId;
  name: string;
  description: string;
  price: number;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
  /** IVA incluido en el total (informativo). */
  taxIncluded: number;
  freeShippingApplied: boolean;
}
