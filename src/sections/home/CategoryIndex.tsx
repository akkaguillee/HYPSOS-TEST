import { CampaignImage } from '@/components/media/CampaignImage';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, hasFinePointer, useGSAP } from '@/lib/motion';
import { productsByCategory } from '@shared/catalog';
import { campaignPhotos, type CampaignPhoto } from '@shared/campaign';
import { paths } from '@shared/routes';
import type { CategoryHandle } from '@shared/types';
import { ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router';
import styles from './CategoryIndex.module.css';

const rows: { handle: CategoryHandle; label: string; photo: CampaignPhoto; focus?: string }[] = [
  { handle: 'sudaderas', label: 'Sudaderas', photo: campaignPhotos.stairs, focus: '60% 30%' },
  { handle: 'camisetas', label: 'Camisetas', photo: campaignPhotos.lookTee, focus: '50% 24%' },
  { handle: 'pantalones', label: 'Pantalones', photo: campaignPhotos.cargo, focus: '50% 60%' },
  { handle: 'gorras', label: 'Gorras', photo: campaignPhotos.cap, focus: '50% 22%' },
  { handle: 'accesorios', label: 'Accesorios', photo: campaignPhotos.accessories },
];

const more = [
  { to: paths.collection('stickers'), label: 'Stickers' },
  { to: paths.collection('3d'), label: 'Blind boxes' },
  { to: paths.collection('all'), label: 'Toda la tienda' },
];

/**
 * Índice de categorías como un cartel (Shelby): nombres enormes centrados, separados por líneas
 * finas, con su número y el recuento real de piezas. Con ratón, una foto de la categoría sigue
 * al puntero y cambia abriéndose desde el centro; en táctil, cada fila lleva su foto en círculo
 * (el contrapunto circular de 21 TSI).
 */
export function CategoryIndex() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    (_context, contextSafe) => {
      const section = root.current;
      if (!section || reduced || !contextSafe || !hasFinePointer()) return;
      const list = section.querySelector<HTMLElement>(`.${styles.list}`);
      const preview = section.querySelector<HTMLElement>(`.${styles.preview}`);
      const slides = gsap.utils.toArray<HTMLElement>(`.${styles.slide}`, section);
      if (!list || !preview) return;
      gsap.set(preview, { scale: 0, xPercent: -50, yPercent: -50 });
      const moveX = gsap.quickTo(preview, 'x', { duration: 0.55, ease: 'power3.out' });
      const moveY = gsap.quickTo(preview, 'y', { duration: 0.55, ease: 'power3.out' });
      const tilt = gsap.quickTo(preview, 'rotation', { duration: 0.6, ease: 'power3.out' });
      let lastX = 0;
      let current = -1;

      const show = (index: number) => {
        if (index === current) return;
        const slide = slides[index];
        if (!slide) return;
        current = index;
        gsap.set(slide, { zIndex: 2 });
        slides.forEach((other, i) => i !== index && gsap.set(other, { zIndex: 1 }));
        gsap.fromTo(slide, { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.out', overwrite: true });
        gsap.fromTo(slide.firstElementChild, { scale: 1.3 }, { scale: 1, duration: 0.8, ease: 'expo.out', overwrite: true });
      };

      const onMove = contextSafe((event: PointerEvent) => {
        const bounds = section.getBoundingClientRect();
        moveX(event.clientX - bounds.left);
        moveY(event.clientY - bounds.top);
        tilt(gsap.utils.clamp(-10, 10, (event.clientX - lastX) * 0.4));
        lastX = event.clientX;
      });
      const onEnter = contextSafe((event: PointerEvent) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
        if (!row) return;
        show(Number(row.dataset.row));
        gsap.to(preview, { scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
      });
      const onLeave = contextSafe(() => {
        current = -1;
        gsap.to(preview, { scale: 0, duration: 0.4, ease: 'power3.in', overwrite: 'auto' });
      });

      list.addEventListener('pointermove', onMove);
      list.addEventListener('pointerover', onEnter);
      list.addEventListener('pointerleave', onLeave);
      return () => {
        list.removeEventListener('pointermove', onMove);
        list.removeEventListener('pointerover', onEnter);
        list.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={`section ${styles.section}`} data-theme="dark" aria-labelledby="categories-title">
      <div className="container">
        <header className={styles.head}>
          <p className="eyebrow">
            <Scramble>Categorías</Scramble>
          </p>
          <SplitHeadline id="categories-title" className={styles.title}>
            Viste la <span className="mix-accent">subida</span>
          </SplitHeadline>
        </header>

        <ul role="list" className={styles.list}>
          {rows.map((row, index) => {
            const count = productsByCategory(row.handle).length;
            return (
              <li key={row.handle} className={styles.item}>
                <Link to={paths.collection(row.handle)} className={styles.row} data-row={index} viewTransition>
                  <span className={styles.index} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.thumb} aria-hidden="true">
                    <CampaignImage photo={row.photo} sizes="64px" decorative focus={row.focus} />
                  </span>
                  <span className={styles.name}>{row.label}</span>
                  <span className={styles.count}>{count === 1 ? '1 pieza' : `${count} piezas`}</span>
                  <ArrowUpRight className={styles.arrow} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        <ul role="list" className={styles.more}>
          {more.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className={styles.chip} viewTransition>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Foto que sigue al puntero (solo con ratón). */}
      <div className={styles.preview} aria-hidden="true">
        {rows.map((row) => (
          <div key={row.handle} className={styles.slide}>
            <CampaignImage photo={row.photo} sizes="320px" decorative focus={row.focus} />
          </div>
        ))}
      </div>
    </section>
  );
}
