import { ProductArt } from '@/components/commerce/ProductArt';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Reveal } from '@/components/motion/Reveal';
import { useMediaQuery, useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { categories, featuredProducts, productsByCategory } from '@shared/catalog';
import { paths } from '@shared/routes';
import { ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import styles from './CategoryIndex.module.css';

/** Índice tipográfico de categorías con vista previa flotante al pasar el cursor. */
export function CategoryIndex() {
  const root = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const ranked = featuredProducts(99);

  const entries = categories.map((category) => ({
    category,
    count: productsByCategory(category.handle).length,
    // Producto representativo: el más destacado de la categoría.
    cover: ranked.find((product) => product.category === category.handle),
  }));

  useGSAP(
    (_context, contextSafe) => {
      if (!finePointer || !preview.current || !root.current || !contextSafe) return;
      const x = gsap.quickTo(preview.current, 'x', { duration: reduced ? 0 : 0.55, ease: 'power3.out' });
      const y = gsap.quickTo(preview.current, 'y', { duration: reduced ? 0 : 0.55, ease: 'power3.out' });
      const list = root.current.querySelector('ul')!;
      let shown = false;
      const show = (event: PointerEvent) => {
        // Se coloca en el puntero antes de mostrarse (el scroll no emite pointermove).
        gsap.set(preview.current, { x: event.clientX + 24, y: event.clientY - 40 });
        gsap.to(preview.current, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        shown = true;
      };
      const hide = contextSafe(() => {
        if (!shown) return;
        shown = false;
        gsap.to(preview.current, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
        setActive(null);
      });
      const onMove = contextSafe((event: PointerEvent) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>('[data-category]');
        if (row?.dataset.category) setActive(row.dataset.category);
        if (!shown) show(event);
        x(event.clientX + 24);
        y(event.clientY - 40);
      });
      const onEnter = contextSafe(show);
      gsap.set(preview.current, { scale: 0.92, xPercent: 0, yPercent: -50 });
      list.addEventListener('pointermove', onMove);
      list.addEventListener('pointerenter', onEnter);
      list.addEventListener('pointerleave', hide);
      window.addEventListener('scroll', hide, { passive: true });
      return () => {
        window.removeEventListener('scroll', hide);
        list.removeEventListener('pointermove', onMove);
        list.removeEventListener('pointerenter', onEnter);
        list.removeEventListener('pointerleave', hide);
      };
    },
    { scope: root, dependencies: [reduced, finePointer], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="section" aria-labelledby="categories-title">
      <div className="container">
        <div className="section-head">
          <div className="section-head__titles">
            <p className="eyebrow">Explora</p>
            <SplitHeadline id="categories-title" className="t-h2">
              Categorías
            </SplitHeadline>
          </div>
        </div>
        <ul role="list" className={styles.list}>
          {entries.map(({ category, count }, index) => (
            <Reveal as="li" key={category.handle} className={styles.row} index={index}>
              <Link
                to={paths.collection(category.handle)}
                className={styles.link}
                data-category={category.handle}
                viewTransition
              >
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.name}>{category.name}</span>
                <span className={styles.description}>{category.description}</span>
                <span className={styles.count}>
                  {count} {count === 1 ? 'pieza' : 'piezas'}
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
      {finePointer && (
        <div ref={preview} className={styles.preview} aria-hidden="true">
          {entries.map(
            ({ category, cover }) =>
              cover && (
                <div key={category.handle} className={styles.previewItem} data-active={active === category.handle}>
                  <ProductArt product={cover} compact decorative />
                </div>
              ),
          )}
        </div>
      )}
    </section>
  );
}
