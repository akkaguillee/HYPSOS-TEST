import { MediaLightbox } from '@/components/commerce/MediaLightbox';
import { ProductBadges } from '@/components/commerce/ProductBadges';
import { ProductMedia } from '@/components/commerce/ProductMedia';
import { ProductRail } from '@/components/commerce/ProductRail';
import { SizeGuideTable } from '@/components/commerce/SizeGuide';
import { StockAlertForm } from '@/components/commerce/StockAlertForm';
import { ColorPicker, SizePicker } from '@/components/commerce/VariantPicker';
import { WishlistButton } from '@/components/commerce/WishlistButton';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Field';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { Modal } from '@/components/ui/Modal';
import { Price } from '@/components/ui/Price';
import { track } from '@/lib/analytics';
import { useProductHoverGL } from '@/lib/gl/useProductHoverGL';
import { mediaForColor } from '@/lib/product-media';
import { useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { useStoreStatus } from '@/store/storeStatus';
import { useUi } from '@/store/ui';
import {
  getCategory,
  getCollection,
  getProductByHandle,
  getStock,
  isColorAvailable,
  isProductAvailable,
  relatedProducts,
  variantSku,
} from '@shared/catalog';
import { returnWindowDays, shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import type { Product, ProductMedia as Media } from '@shared/types';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Expand, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import NotFoundPage from './NotFoundPage';
import styles from './ProductPage.module.css';

const VIEW_NAME: Record<string, string> = {
  front: 'Delantera',
  back: 'Trasera',
  detail: 'Detalle',
};

/** Nombre corto de una vista de la galería (mockup: delantera/trasera/detalle; foto: número). */
function viewName(media: Media, index: number) {
  return media.type === 'mockup' ? VIEW_NAME[media.view] : `Foto ${index + 1}`;
}

export default function ProductPage() {
  const { handle = '' } = useParams();
  const product = getProductByHandle(handle);
  if (!product) return <NotFoundPage />;
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: Product }) {
  const [params, setParams] = useSearchParams();
  const { known, lookup, status: stockStatus } = useStock();
  const loadInventory = useInventory((state) => state.load);
  const paymentsReady = useStoreStatus((state) => state.payments);
  const serverOnline = useStoreStatus((state) => state.online || !state.loaded);

  // Color: el pedido en la URL si existe y está disponible; si no, el primero con stock.
  const requested = product.colors.find((color) => color.id === params.get('color'));
  const firstAvailable = product.colors.find((color) => isColorAvailable(product, color.id, lookup)) ?? product.colors[0];
  const color = requested && (!known || isColorAvailable(product, requested.id, lookup)) ? requested : firstAvailable;
  const colorId = color.id;

  const singleSize = product.sizes.length === 1 ? product.sizes[0] : null;
  const [chosenSize, setChosenSize] = useState<string | null>(singleSize);
  const sizeAvailable = (size: string) => !known || getStock(product, colorId, size, lookup) > 0;
  const size = chosenSize && sizeAvailable(chosenSize) ? chosenSize : singleSize && sizeAvailable(singleSize) ? singleSize : null;

  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const add = useCart((state) => state.add);
  const openCart = useCart((state) => state.open);
  const inCart = useCart((state) => state.lines.find((line) => line.id === `${product.id}:${colorId}:${size}`)?.quantity ?? 0);
  const announce = useUi((state) => state.announce);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  const buyButton = useRef<HTMLDivElement>(null);
  const slides = useRef<HTMLDivElement>(null);
  // Lupa, estela e inclinación WebGL sobre cada imagen (puntero fino; si no, nada cambia).
  useProductHoverGL(slides, { mode: 'lens' });
  const errorId = useId();
  const chapterId = useId();

  const category = getCategory(product.category)!;
  const collection = product.collections.map(getCollection).find(Boolean);
  const media = mediaForColor(product, colorId);
  const available = !known || isProductAvailable(product, lookup);
  const colorAvailable = !known || isColorAvailable(product, colorId, lookup);
  const stock = size && known ? getStock(product, colorId, size, lookup) : null;
  const soldOutSizes = known ? product.sizes.filter((value) => getStock(product, colorId, value, lookup) <= 0) : [];
  const allMockups = media.every((item) => item.type === 'mockup');

  // Stock siempre fresco al abrir una ficha y registro de la visita (si hay consentimiento).
  useEffect(() => {
    void loadInventory(true);
    track('view_item', {
      item_id: product.id,
      item_name: product.name,
      price: product.price / 100,
      item_category: product.category,
    });
  }, [product, loadInventory]);

  /** Lleva el carrusel (móvil/tableta) a una vista concreta. */
  const goToSlide = (index: number, smooth = true) => {
    const element = slides.current;
    const target = element?.children[index] as HTMLElement | undefined;
    if (!element || !target) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const first = element.children[0] as HTMLElement;
    element.scrollTo({
      left: target.offsetLeft - first.offsetLeft,
      behavior: smooth && !reduced ? 'smooth' : 'auto',
    });
  };

  const selectColor = (id: string) => {
    setParams(id === product.colors[0].id ? {} : { color: id }, {
      replace: true,
      preventScrollReset: true,
    });
    setSlide(0);
    setError(null);
    goToSlide(0, false);
    track('select_variant', { item_id: product.id, variant: id });
  };

  const selectSize = (value: string) => {
    setChosenSize(value);
    setError(null);
    track('select_variant', {
      item_id: product.id,
      variant: variantSku(product, colorId, value),
    });
  };

  const addToCart = () => {
    if (!size) {
      setError('Selecciona una talla');
      sizeGroup.current?.focus();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sizeGroup.current?.scrollIntoView({
        block: 'center',
        behavior: reduced ? 'auto' : 'smooth',
      });
      return;
    }
    const quantityAdded = add({
      productId: product.id,
      colorId,
      size,
      quantity: 1,
    });
    if (quantityAdded === 0) {
      setError('Ya tienes en el carrito todas las unidades disponibles de esta talla.');
      return;
    }
    setError(null);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
    track('add_to_cart', {
      item_id: product.id,
      variant: variantSku(product, colorId, size),
      price: product.price / 100,
      quantity: 1,
    });
    announce(`${product.name}, ${color.name}, talla ${size}, añadido al carrito`);
    openCart();
  };

  // Barra fija de compra en móvil: aparece cuando el botón principal sale de pantalla
  // (el margen inferior enorme hace que un scroll rápido nunca se salte el aviso).
  useEffect(() => {
    const target = buyButton.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { rootMargin: '0px 0px 100000px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // …y se retira al llegar al final del documento para no tapar la última línea del pie.
  const [atPageEnd, setAtPageEnd] = useState(false);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const root = document.documentElement;
      setAtPageEnd(window.scrollY + window.innerHeight >= root.scrollHeight - 96);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  const barShown = stickyVisible && !atPageEnd;

  // Vista activa del carrusel: la diapositiva más cercana al borde izquierdo (vale con o sin asomo).
  useEffect(() => {
    const element = slides.current;
    if (!element) return;
    const onScroll = () => {
      const items = [...element.children] as HTMLElement[];
      if (items.length === 0) return;
      const base = items[0].offsetLeft;
      let nearest = 0;
      items.forEach((item, index) => {
        if (Math.abs(item.offsetLeft - base - element.scrollLeft) < Math.abs(items[nearest].offsetLeft - base - element.scrollLeft)) nearest = index;
      });
      setSlide(nearest);
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  const buttonLabel = added ? 'Añadido' : !available ? 'Agotado' : !colorAvailable ? 'Agotado en este color' : 'Añadir al carrito';
  const stickyLabel = added ? 'Añadido' : !colorAvailable ? 'Agotado' : !size ? 'Elegir talla' : 'Añadir';
  const related = relatedProducts(product, 8);
  const reference = size ? variantSku(product, colorId, size) : product.code;
  const lowStock = stock !== null && stock > 0 && stock <= 3;
  const stickyMeta = [product.colors.length > 1 ? color.name : null, !singleSize && size ? `Talla ${size}` : null].filter(Boolean).join(' / ');

  // «Avísame»: enlace de texto que despliega el formulario en su sitio (bajo las tallas o bajo la compra).
  const stockAlert =
    soldOutSizes.length > 0 &&
    (alertOpen || !colorAvailable ? (
      <div className={styles.alertForm}>
        <StockAlertForm product={product} colorId={colorId} sizes={soldOutSizes} />
      </div>
    ) : (
      <button type="button" className={styles.alertToggle} onClick={() => setAlertOpen(true)}>
        ¿Agotada tu talla? <span>Avísame cuando vuelva</span>
      </button>
    ));

  const hasFitInfo = Boolean(product.sizeGuide || product.fit);

  return (
    <article className={styles.page}>
      <div className={`container ${styles.layout}`}>
        <div className={styles.gallery}>
          <div className={styles.stage}>
            <div ref={slides} className={styles.slides} aria-label={`Imágenes de ${product.name}`} role="region" tabIndex={0}>
              {media.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.slide}
                  data-cursor="view"
                  onClick={() => setLightbox(index)}
                  aria-label={`Ampliar imagen ${index + 1} de ${media.length}, ${viewName(item, index).toLowerCase()}`}
                >
                  {/* Gancho para la interacción con el cursor (la añade la capa de movimiento global). */}
                  <span className={styles.media} data-product-media="">
                    <ProductMedia
                      product={product}
                      media={item}
                      colorId={colorId}
                      priority={index === 0}
                      sizes={
                        index === 0
                          ? '(min-width: 1024px) 42vw, (min-width: 600px) 62vw, 100vw'
                          : '(min-width: 1024px) 21vw, (min-width: 600px) 62vw, 100vw'
                      }
                    />
                  </span>
                  {/* Etiqueta de vista + ampliar, en cristal sobre la imagen (solo mosaico de escritorio). */}
                  <LiquidGlass as="span" radius="pill" bezel={16} refraction={22} tone="light" className={styles.tileTag} aria-hidden="true">
                    <Expand />
                    {viewName(item, index)}
                  </LiquidGlass>
                </button>
              ))}
            </div>

            {/* Controles del carrusel (móvil y tableta): vistas segmentadas, anterior/siguiente y ampliar. */}
            {media.length > 1 && (
              <>
                <LiquidGlass
                  radius="pill"
                  bezel={20}
                  refraction={24}
                  tone="light"
                  className={styles.views}
                  role="group"
                  aria-label="Vistas del producto"
                >
                  {media.map((item, index) => (
                    <button key={index} type="button" className={styles.view} aria-current={index === slide} onClick={() => goToSlide(index)}>
                      {viewName(item, index)}
                    </button>
                  ))}
                </LiquidGlass>
                <LiquidGlass
                  as="button"
                  type="button"
                  radius="pill"
                  bezel={22}
                  refraction={26}
                  tone="light"
                  className={`${styles.arrow} ${styles.arrowPrev}`}
                  aria-label="Vista anterior"
                  disabled={slide === 0}
                  onClick={() => goToSlide(slide - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </LiquidGlass>
                <LiquidGlass
                  as="button"
                  type="button"
                  radius="pill"
                  bezel={22}
                  refraction={26}
                  tone="light"
                  className={`${styles.arrow} ${styles.arrowNext}`}
                  aria-label="Vista siguiente"
                  disabled={slide === media.length - 1}
                  onClick={() => goToSlide(slide + 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </LiquidGlass>
              </>
            )}
            {/* Selector de color en cristal sobre la imagen: atajo del selector de la caja de compra. */}
            {product.colors.length > 1 && (
              <LiquidGlass
                radius="pill"
                bezel={20}
                refraction={26}
                tone="light"
                className={styles.colorDock}
                role="group"
                aria-label="Color en la imagen"
              >
                {product.colors.map((option) => {
                  const optionAvailable = !known || isColorAvailable(product, option.id, lookup);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.dockSwatch}
                      aria-label={`Mostrar en ${option.name.toLowerCase()}${optionAvailable ? '' : ' (agotado)'}`}
                      aria-pressed={option.id === colorId}
                      disabled={!optionAvailable}
                      onClick={() => option.id !== colorId && selectColor(option.id)}
                    >
                      <span style={{ background: option.hex }} />
                    </button>
                  );
                })}
              </LiquidGlass>
            )}
            <LiquidGlass
              as="button"
              type="button"
              radius="pill"
              bezel={22}
              refraction={26}
              tone="light"
              className={styles.zoom}
              aria-label="Ver a pantalla completa"
              onClick={() => setLightbox(slide)}
            >
              <Expand aria-hidden="true" />
            </LiquidGlass>
          </div>

          {allMockups && <p className={styles.mediaNote}>Mockups digitales provisionales</p>}
        </div>

        <div className={styles.info}>
          <div className={styles.crumbs}>
            <Breadcrumbs
              items={[{ label: 'Inicio', to: paths.home }, { label: category.name, to: paths.collection(category.handle) }, { label: product.name }]}
            />
          </div>
          <Link to={paths.collection(category.handle)} className={styles.back} viewTransition>
            <ArrowLeft aria-hidden="true" />
            {category.name}
          </Link>

          {/* Identidad: código, nombre, precio y la frase corta. */}
          <div className={styles.identity}>
            <div className={styles.meta}>
              <span className={styles.code}>{product.code}</span>
              <ProductBadges product={product} className={styles.badges} surface="page" edition={product.editionSize} />
            </div>
            <h1 className={styles.title}>{product.name}</h1>
            <p className={styles.priceRow}>
              <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
              <span className={styles.taxNote}>IVA incluido</span>
            </p>
            <p className={styles.description}>{product.shortDescription}</p>
          </div>

          {/* Elección: color y talla. */}
          {(product.colors.length > 1 || !singleSize) && (
            <div className={styles.choices}>
              {product.colors.length > 1 && (
                <ColorPicker product={product} value={colorId} onChange={selectColor} stock={lookup} stockKnown={known} />
              )}

              {!singleSize && (
                <SizePicker
                  product={product}
                  colorId={colorId}
                  value={size}
                  onChange={selectSize}
                  stock={lookup}
                  stockKnown={known}
                  error={error ?? undefined}
                  errorId={errorId}
                  groupRef={sizeGroup}
                  footer={stockAlert}
                  action={
                    product.sizeGuide && (
                      <button type="button" className={styles.textButton} onClick={() => setGuideOpen(true)} aria-haspopup="dialog">
                        Guía de tallas
                      </button>
                    )
                  }
                />
              )}
            </div>
          )}

          {/* Acción: compra + favoritos y una línea de estado reservada. */}
          <div ref={buyButton} className={styles.purchase}>
            <div className={styles.actions}>
              <Button size="lg" block variant={colorAvailable ? 'primary' : 'outline'} onClick={addToCart} disabled={!colorAvailable}>
                {added && <Check aria-hidden="true" size={18} />}
                {buttonLabel}
              </Button>
              <WishlistButton product={product} withLabel className={styles.wishlist} />
            </div>
            {error && (
              <div id={errorId} className={styles.purchaseError}>
                <Alert>{error}</Alert>
              </div>
            )}
            <p className={styles.stockMessage} data-tone={lowStock ? 'low' : undefined} aria-live="polite">
              {stockStatus === 'loading' && !known && 'Comprobando disponibilidad…'}
              {stockStatus === 'error' &&
                (serverOnline
                  ? 'No hemos podido comprobar el stock ahora mismo; se confirmará al finalizar la compra.'
                  : 'Stock en tiempo real no disponible en esta versión de la web.')}
              {known && !colorAvailable && `Agotado en ${color.name.toLowerCase()}`}
              {known &&
                size &&
                stock !== null &&
                stock > 0 &&
                (singleSize
                  ? lowStock
                    ? `Últimas ${stock} unidades`
                    : 'Disponible'
                  : lowStock
                    ? `Últimas ${stock} unidades en talla ${size}`
                    : `Disponible en talla ${size}`)}
              {known && colorAvailable && !size && !singleSize && 'Elige tu talla para ver la disponibilidad'}
              {known &&
                size &&
                inCart > 0 &&
                stock !== null &&
                inCart >= Math.min(stock, store.maxQuantityPerLine) &&
                ' / Ya tienes todas en el carrito'}
            </p>
            {store.demoCatalog && <p className={styles.demoNote}>Producto de demostración / precio y stock no son reales</p>}
          </div>

          {singleSize && stockAlert && <div className={styles.singleAlert}>{stockAlert}</div>}

          {/* Hechos de servicio: solo lo que está configurado de verdad. */}
          <ul role="list" className={styles.trust}>
            {shippingMethods.map((method) => (
              <li key={method.id}>
                <Truck aria-hidden="true" />
                {method.name}: {method.description} / {formatPrice(method.price)}
                {method.freeFrom !== undefined && ` (gratis desde ${formatPrice(method.freeFrom)})`}
              </li>
            ))}
            <li>
              <RotateCcw aria-hidden="true" />
              {returnWindowDays()} días naturales para devolverlo
            </li>
            {paymentsReady && (
              <li>
                <ShieldCheck aria-hidden="true" />
                Pago seguro con Stripe
              </li>
            )}
          </ul>

          <div className={styles.details}>
            <Accordion
              headingLevel="h2"
              items={[
                {
                  id: 'descripcion',
                  title: 'Descripción',
                  content: <p>{product.description}</p>,
                },
                {
                  id: 'detalles',
                  title: hasFitInfo ? 'Ajuste y medidas' : 'Detalles',
                  content: (
                    <>
                      {product.fit && <p>{product.fit}</p>}
                      <ul>
                        {product.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                      {product.sizeGuide && (
                        <p>
                          <button type="button" className={styles.textButton} onClick={() => setGuideOpen(true)} aria-haspopup="dialog">
                            Ver la tabla de medidas
                          </button>
                        </p>
                      )}
                      <p className="t-micro">Ref. {reference}</p>
                    </>
                  ),
                },
                {
                  id: 'composicion',
                  title: product.sizeGuide ? 'Tejido y cuidados' : 'Material y cuidados',
                  content: (
                    <>
                      <p>{product.composition}</p>
                      <ul>
                        {product.care.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </>
                  ),
                },
                {
                  id: 'envios',
                  title: 'Envíos y devoluciones',
                  content: (
                    <p>
                      Tienes {returnWindowDays()} días naturales desde la entrega para devolver el pedido.{' '}
                      <Link to={paths.page('envios')} className="link">
                        Condiciones de envío y devolución
                      </Link>
                    </p>
                  ),
                },
              ]}
            />
          </div>

          {/* Capítulo de la colección: el texto es el de la propia colección (sin inventar). */}
          {collection && (
            <section className={styles.chapter} data-theme="dark" aria-labelledby={chapterId}>
              <h2 id={chapterId} className={styles.chapterKicker}>
                {collection.kicker} / {collection.name}
              </h2>
              <p className={styles.chapterText}>{collection.description}</p>
              <Link to={paths.collection(collection.handle)} className={styles.chapterLink} viewTransition>
                Ver la colección
                <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <ProductRail
            products={related}
            label="Productos relacionados"
            header={(controls) => (
              <div className="section-head">
                <h2 id="related-title" className={styles.relatedTitle}>
                  También te puede gustar
                </h2>
                {controls}
              </div>
            )}
          />
        </section>
      )}

      {/* Barra de compra fija en móvil (cristal flotante, como la cabecera). */}
      <LiquidGlass
        radius={24}
        bezel={20}
        refraction={22}
        tone="light"
        className={styles.stickyBar}
        data-visible={barShown}
        inert={!barShown}
        aria-hidden={!barShown}
      >
        <span className={styles.stickyThumb} aria-hidden="true">
          {media[0] && <ProductMedia product={product} media={media[0]} colorId={colorId} decorative sizes="48px" />}
        </span>
        <span className={styles.stickyName}>
          <strong>{product.name}</strong>
          <span>
            {stickyMeta && `${stickyMeta} / `}
            <Price amount={product.price} />
          </span>
        </span>
        <Button variant={colorAvailable ? 'primary' : 'outline'} onClick={addToCart} disabled={!colorAvailable} className={styles.stickyCta}>
          {stickyLabel}
        </Button>
      </LiquidGlass>

      <MediaLightbox
        product={product}
        media={media}
        colorId={colorId}
        open={lightbox !== null}
        index={lightbox ?? 0}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
      />

      {product.sizeGuide && (
        <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Guía de tallas">
          <SizeGuideTable type={product.sizeGuide} />
        </Modal>
      )}
    </article>
  );
}
