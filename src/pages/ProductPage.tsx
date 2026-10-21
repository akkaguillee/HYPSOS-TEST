import { ProductBadges } from '@/components/commerce/ProductBadges';
import { ProductMedia } from '@/components/commerce/ProductMedia';
import { mediaForColor } from '@/lib/product-media';
import { ProductRail } from '@/components/commerce/ProductRail';
import { SizeGuideTable } from '@/components/commerce/SizeGuide';
import { ColorPicker, SizePicker } from '@/components/commerce/VariantPicker';
import { WishlistButton } from '@/components/commerce/WishlistButton';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Price } from '@/components/ui/Price';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { getCategory, getProductByHandle, getStock, isColorAvailable, isProductAvailable, relatedProducts } from '@shared/catalog';
import { store } from '@shared/config';
import { formatPrice } from '@shared/pricing';
import { paths } from '@shared/routes';
import type { Product } from '@shared/types';
import { RotateCcw, ShieldCheck, Truck } from 'lucide-react';
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
  const requestedColor = params.get('color');
  const defaultColor =
    product.colors.find((color) => color.id === requestedColor) ??
    product.colors.find((color) => isColorAvailable(product, color.id)) ??
    product.colors[0];
  const colorId = defaultColor.id;
  const singleSize = product.sizes.length === 1 ? product.sizes[0] : null;
  const [size, setSize] = useState<string | null>(singleSize);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const add = useCart((state) => state.add);
  const openCart = useCart((state) => state.open);
  const inCart = useCart((state) => state.lines.find((line) => line.id === `${product.id}:${colorId}:${size}`)?.quantity ?? 0);
  const announce = useUi((state) => state.announce);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  const buyButton = useRef<HTMLDivElement>(null);
  const slides = useRef<HTMLDivElement>(null);
  const errorId = useId();

  const category = getCategory(product.category)!;
  const color = product.colors.find((option) => option.id === colorId)!;
  const media = mediaForColor(product, colorId);
  const available = isProductAvailable(product);
  const colorAvailable = isColorAvailable(product, colorId);
  const stock = size ? getStock(product, colorId, size) : null;
  const remaining = stock === null ? null : Math.min(stock, store.maxQuantityPerLine) - inCart;

  const selectColor = (id: string) => {
    setParams(id === product.colors[0].id ? {} : { color: id }, { replace: true, preventScrollReset: true });
    // Si la talla elegida no existe en el nuevo color, se deselecciona.
    if (size && getStock(product, id, size) <= 0) setSize(singleSize && getStock(product, id, singleSize) > 0 ? singleSize : null);
    setSlide(0);
    slides.current?.scrollTo({ left: 0 });
  };

  const addToCart = () => {
    if (!size) {
      setError('Selecciona una talla');
      sizeGroup.current?.focus();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sizeGroup.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    const added = add({ productId: product.id, colorId, size, quantity: 1 });
    if (added === 0) {
      setError('Ya tienes en el carrito todas las unidades disponibles de esta talla.');
      return;
    }
    setError(null);
    announce(`${product.name}, ${color.name}, talla ${size}, añadido al carrito`);
    openCart();
  };

  // Barra fija de compra en móvil: aparece cuando el botón principal sale de pantalla.
  useEffect(() => {
    const target = buyButton.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    // El margen inferior enorme hace que todo lo que está por debajo cuente como "visible":
    // así el aviso llega aunque un scroll rápido salte el botón sin cruzar la pantalla.
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), {
      rootMargin: '0px 0px 100000px 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Indicador del carrusel móvil.
  useEffect(() => {
    const element = slides.current;
    if (!element) return;
    const onScroll = () => setSlide(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  const buttonLabel = !available ? 'Agotado' : !colorAvailable ? 'Agotado en este color' : 'Añadir al carrito';
  const related = relatedProducts(product, 8);

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
                <div key={index} className={styles.slide}>
                  <ProductMedia
                    product={product}
                    media={item}
                    colorId={colorId}
                    priority={index === 0}
                    sizes="(min-width: 1024px) 58vw, 100vw"
                  />
                </div>
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
              <ProductBadges product={product} className={styles.badges} />
              <h1 className={styles.title}>{product.name}</h1>
              <Price amount={product.price} compareAt={product.compareAtPrice} className={styles.price} />
              <p className={styles.taxNote}>
                IVA incluido. Envío estándar gratuito desde {formatPrice(store.freeShippingThreshold)}.
              </p>
              {product.editionSize && <p className={styles.edition}>Edición limitada de {product.editionSize} unidades</p>}
            </div>

            <p className={styles.description}>{product.shortDescription}</p>

            {product.colors.length > 1 && <ColorPicker product={product} value={colorId} onChange={selectColor} />}

            {!singleSize && (
              <SizePicker
                product={product}
                colorId={colorId}
                value={size}
                onChange={(value) => {
                  setSize(value);
                  setError(null);
                }}
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
              <Button size="lg" block sheen onClick={addToCart} disabled={!colorAvailable}>
                {buttonLabel}
              </Button>
              <WishlistButton product={product} withLabel />
              {error && (
                <div id={errorId} className={styles.purchaseError}>
                  <Alert>{error}</Alert>
                </div>
              )}
              {size && stock !== null && stock > 0 && (
                <p className={styles.stockMessage} data-tone={stock <= 3 ? 'low' : undefined} aria-live="polite">
                  {stock <= 3 ? `Últimas ${stock} unidades en talla ${size}` : `En stock · envío en 24–48 h laborables`}
                  {remaining !== null && remaining <= 0 && ' · Ya tienes todas en el carrito'}
                </p>
              )}
            </div>

            <ul role="list" className={styles.trust}>
              <li>
                <Truck aria-hidden="true" />
                Envío estándar gratuito desde {formatPrice(store.freeShippingThreshold)}
              </li>
              <li>
                <RotateCcw aria-hidden="true" />
                Devoluciones durante {store.returnWindowDays} días
              </li>
              <li>
                <ShieldCheck aria-hidden="true" />
                Pago seguro cifrado
              </li>
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
                      <p className="t-micro">Ref. {product.code}</p>
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
                      Envío estándar en 3–5 días laborables y exprés en 24–48 h. Tienes {store.returnWindowDays} días para devolver tu pedido.{' '}
                      <Link to={paths.page('envios')} className="link">
                        Más información
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
          {colorAvailable ? 'Añadir' : 'Agotado'}
        </Button>
      </div>

      {product.sizeGuide && (
        <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Guía de tallas">
          <SizeGuideTable type={product.sizeGuide} />
        </Modal>
      )}
    </article>
  );
}
