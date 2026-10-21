import { ChromeMonogram } from '@/components/brand/ChromeMonogram';
import { ButtonLink } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, hasFinePointer, SplitText, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { productsByCollection } from '@shared/catalog';
import { paths } from '@shared/routes';
import { ArrowDown } from 'lucide-react';
import { useRef } from 'react';
import styles from './Hero.module.css';

const DROP = 'drop-01-ascenso';

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const chromeRef = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();
  // Mientras la intro tapa la página, el hero espera en su estado inicial.
  const ready = useIntro((state) => state.phase !== 'intro');
  const pieces = productsByCollection(DROP).length;

  useGSAP(
    (_context, contextSafe) => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const headline = q(`.${styles.headline}`)[0] as HTMLElement;
      const reveals = q('[data-hero-reveal]');

      if (!ready) {
        gsap.set([headline, ...reveals, q(`.${styles.chromeWrap}`)], { autoAlpha: 0 });
        return;
      }

      // ── Entrada ──────────────────────────────────────────────────────
      const intro = gsap.timeline({ defaults: { ease: EASE.out } });
      intro
        .fromTo(q(`.${styles.chromeWrap}`), { autoAlpha: 0, scale: 1.14, yPercent: 4 }, { autoAlpha: 1, scale: 1, yPercent: 0, duration: 1.8 }, 0)
        .from(q(`.${styles.glow}`), { autoAlpha: 0, duration: 2 }, 0.2)
        .fromTo(q(`.${styles.sweep}`), { xPercent: -110 }, { xPercent: 110, duration: 1.6, ease: 'power2.inOut' }, 0.7)
        .from(reveals, { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.08 }, 0.55)
        .from(q(`.${styles.metaLine}`), { scaleX: 0, duration: 1.4 }, 0.9);

      SplitText.create(headline, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 115, duration: 1.1, ease: EASE.out, stagger: 0.1, delay: intro.time() > 0 ? 0 : 0.25 }),
      });

      // ── Scroll: el monograma se acerca y el texto se retira ─────────
      gsap.to(q(`.${styles.chromeWrap}`), {
        yPercent: 14,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.5 },
      });
      gsap.to(q(`.${styles.content}`), {
        yPercent: -8,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: '35% top', end: '85% top', scrub: 0.5 },
      });

      // ── Puntero: ligera inclinación 3D y luz que sigue al cursor ────
      if (!hasFinePointer() || !chromeRef.current || !contextSafe) return;
      gsap.set(chromeRef.current, { transformPerspective: 1400 });
      const rotateX = gsap.quickTo(chromeRef.current, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const rotateY = gsap.quickTo(chromeRef.current, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      const onMove = contextSafe((event: PointerEvent) => {
        const bounds = root.current!.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        rotateY(x * 7);
        rotateX(y * -5);
      });
      const onLeave = contextSafe(() => {
        rotateX(0);
        rotateY(0);
      });
      const element = root.current;
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      return () => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: root, dependencies: [ready, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.media}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.chromeWrap}>
          <ChromeMonogram ref={chromeRef} className={styles.chrome} priority sizes="(min-width: 1024px) 70vw, 118vw" />
          <div className={styles.sweep} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={`container ${styles.content}`}>
        <p className={`eyebrow ${styles.eyebrow}`} data-hero-reveal>
          Drop 01 — Ascenso · Disponible ahora
        </p>
        <h1 id="hero-title" className={`t-campaign ${styles.headline}`}>
          Por encima del ruido
        </h1>
        <p className={styles.lead} data-hero-reveal>
          Algodón pesado, cortes amplios y gráficos en tiradas cortas. La primera entrega de HYPSOS ya está aquí.
        </p>
        <div className={styles.ctas} data-hero-reveal>
          <ButtonLink to={paths.collection(DROP)} size="lg" sheen>
            Comprar el drop
          </ButtonLink>
          <ButtonLink to={paths.collection('all')} size="lg" variant="outline">
            Toda la tienda
          </ButtonLink>
        </div>
        <div className={styles.meta} data-hero-reveal>
          <span>01 / {pieces} piezas</span>
          <span className={styles.metaLine} aria-hidden="true" />
          <span className={styles.scrollHint}>
            Desliza
            <ArrowDown aria-hidden="true" />
          </span>
        </div>
      </div>
    </section>
  );
}
