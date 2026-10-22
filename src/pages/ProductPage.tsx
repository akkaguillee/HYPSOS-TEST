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
import { Modal } from '@/components/ui/Modal';
import { Price } from '@/components/ui/Price';
import { track } from '@/lib/analytics';
import { mediaForColor } from '@/lib/product-media';
import { useCart } from '@/store/cart';
import { useInventory, useStock } from '@/store/inventory';
import { useStoreStatus } from '@/store/storeStatus';
import { useUi } from '@/store/ui';
import { getCategory, getProductByHandle, getStock, isColorAvailable, isProductAvailable, relatedProducts, variantSku } from '@shared/catalog';
import { returnWindowDays, shippingMethods, store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { Check, Expand, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import NotFoundPage from './NotFoundPage';
import styles from './ProductPage.module.css';

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
  const errorId = useId();

  const category = getCategory(product.category)!;
  const media = mediaForColor(product, colorId);
  const available = !known || isProductAvailable(product, lookup);
  const colorAvailable = !known || isColorAvailable(product, colorId, lookup);
  const stock = size && known ? getStock(product, colorId, size, lookup) : null;
  const soldOutSizes = known ? product.sizes.filter((value) => getStock(product, colorId, value, lookup) <= 0) : [];

  // Stock siempre fresco al abrir una ficha y registro de la visita (si hay consentimiento).
  useEffect(() => {
    void loadInventory(true);
    track('view_item', { item_id: product.id, item_name: product.name, price: product.price / 100, item_category: product.category });
  }, [product, loadInventory]);

  const selectColor = (id: string) => {
    setParams(id === product.colors[0].id ? {} : { color: id }, { replace: true, preventScrollReset: true });
    setSlide(0);
    setError(null);
    slides.current?.scrollTo({ left: 0 });
    track('select_variant', { item_id: product.id, variant: id });
  };

  const selectSize = (value: string) => {
    setChosenSize(value);
    setError(null);
    track('select_variant', { item_id: product.id, variant: variantSku(product, colorId, value) });
  };

  const addToCart = () => {
    if (!size) {
      setError('Selecciona una talla');
      sizeGroup.current?.focus();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sizeGroup.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    const quantityAdded = add({ productId: product.id, colorId, size, quantity: 1 });
    if (quantityAdded === 0) {
      setError('Ya tienes en el carrito todas las unidades disponibles de esta talla.');
      return;
    }
    setError(null);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
    track('add_to_cart', { item_id: product.id, variant: variantSku(product, colorId, size), price: product.price / 100, quantity: 1 });
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

  useEffect(() => {
    const element = slides.current;
    if (!element) return;
    const onScroll = () => setSlide(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  const buttonLabel = added ? 'Añadido' : !available ? 'Agotado' : !colorAvailable ? 'Agotado en este color' : 'Añadir al carrito';
  const related = relatedProducts(product, 8);
  const reference = size ? variantSku(product, colorId, size) : product.code;

  return (
    <article className={styles.page}>
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: paths.home },
            { label: category.name, to: paths.collection(category.handle) },
            { label: product.name },
          ]}
        />

        <div className={styles.layout}>
          <div className={styles.gallery}>
            <div ref={slides} className={styles.slides} aria-label={`Imágenes de ${product.name}`} role="region" tabIndex={0}>
              {media.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.slide}
                  onClick={() => setLightbox(index)}
                  aria-label={`Ampliar imagen ${index + 1} de ${media.length}`}
                >
                  <ProductMedia product={product} media={item} colorId={colorId} priority={index === 0} sizes="(min-width: 1024px) 58vw, 100vw" />
                  <span className={styles.zoomHint} aria-hidden="true">
                    <Expand />
                  </span>
                </button>
              ))}
            </div>
            {media.length > 1 && (
              <div className={styles.dots} aria-hidden="true">
                {media.map((_, index) => (
                  <span key={index} className={styles.dot} data-active={index === slide} />
                ))}
              </div>
            )}
          </div>

          <div className={styles.info}>
            <div className={styles.head}>
              <ProductBadges product={product} className={styles.badges} surface="page" />
              <h1 className={styles.title}>{product.name}</h1>
              <div className={styles.priceRow}>
                <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
                {store.demoCatalog && <span className={styles.demoTag}>Producto de demostración</span>}
              </div>
              <p className={styles.taxNote}>IVA incluido.</p>
              {product.editionSize && <p className={styles.edition}>Edición limitada de {product.editionSize} unidades</p>}
            </div>

            <p className={styles.description}>{product.shortDescription}</p>

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
                action={
                  product.sizeGuide && (
                    <button type="button" className={styles.sizeGuideButton} onClick={() => setGuideOpen(true)} aria-haspopup="dialog">
                      Guía de tallas
                    </button>
                  )
                }
              />
            )}

            <div ref={buyButton} className={styles.purchase}>
              <Button size="lg" block onClick={addToCart} disabled={!colorAvailable} className={added ? styles.added : undefined}>
                {added && <Check aria-hidden="true" size={18} />}
                {buttonLabel}
              </Button>
              <WishlistButton product={product} withLabel />
              {error && (
                <div id={errorId} className={styles.purchaseError}>
                  <Alert>{error}</Alert>
                </div>
              )}
              <p className={styles.stockMessage} data-tone={stock !== null && stock > 0 && stock <= 3 ? 'low' : undefined} aria-live="polite">
                {stockStatus === 'loading' && !known && 'Comprobando disponibilidad…'}
                {stockStatus === 'error' &&
                  (serverOnline
                    ? 'No hemos podido comprobar el stock ahora mismo; se confirmará al finalizar la compra.'
                    : 'Stock en tiempo real no disponible en esta versión de la web.')}
                {known && size && stock !== null && stock > 0 && (stock <= 3 ? `Últimas ${stock} unidades en talla ${size}` : 'Disponible')}
                {known && size && inCart > 0 && stock !== null && inCart >= Math.min(stock, store.maxQuantityPerLine) && ' · Ya tienes todas en el carrito'}
              </p>
            </div>

            {soldOutSizes.length > 0 && (
              <div className={styles.alertBox}>
                {alertOpen || !colorAvailable ? (
                  <StockAlertForm product={product} colorId={colorId} sizes={soldOutSizes} />
                ) : (
                  <button type="button" className={styles.alertToggle} onClick={() => setAlertOpen(true)}>
                    ¿No está tu talla? Avísame cuando vuelva
                  </button>
                )}
              </div>
            )}

            <ul role="list" className={styles.trust}>
              {shippingMethods.length > 0 ? (
                shippingMethods.map((method) => (
                  <li key={method.id}>
                    <Truck aria-hidden="true" />
                    {method.name}: {method.description} · {formatPrice(method.price)}
                    {method.freeFrom !== undefined && ` (gratis desde ${formatPrice(method.freeFrom)})`}
                  </li>
                ))
              ) : (
                <li>
                  <Truck aria-hidden="true" />
                  <Link to={paths.page('envios')} className="link">
                    Consulta envíos y devoluciones
                  </Link>
                </li>
              )}
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

            <Accordion
              defaultOpen={['descripcion']}
              items={[
                { id: 'descripcion', title: 'Descripción', content: <p>{product.description}</p> },
                {
                  id: 'detalles',
                  title: 'Detalles y ajuste',
                  content: (
                    <>
                      <ul>
                        {product.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                      {product.fit && <p>{product.fit}</p>}
                      <p className="t-micro">Ref. {reference}</p>
                    </>
                  ),
                },
                {
                  id: 'composicion',
                  title: 'Composición y cuidados',
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
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <ProductRail
            products={related}
            label="Productos relacionados"
            header={(controls) => (
              <div className="section-head">
                <div className="section-head__titles">
                  <p className="eyebrow">Completa el look</p>
                  <h2 id="related-title" className="t-h2">
                    También te puede gustar
                  </h2>
                </div>
                {controls}
              </div>
            )}
          />
        </section>
      )}

      <div className={styles.stickyBar} data-visible={stickyVisible} inert={!stickyVisible} aria-hidden={!stickyVisible}>
        <div className={styles.stickyName}>
          <strong>{product.name}</strong>
          <span className="t-muted">
            {color.name}
            {size && ` · ${size}`} · <Price amount={product.price} />
          </span>
        </div>
        <Button onClick={addToCart} disabled={!colorAvailable}>
          {added ? 'Añadido' : colorAvailable ? 'Añadir' : 'Agotado'}
        </Button>
      </div>

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
