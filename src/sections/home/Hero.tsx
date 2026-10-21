import { Monogram, Star } from '@/components/brand/BrandVector';
import { ButtonLink } from '@/components/ui/Button';
import { hero } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, hasFinePointer, SplitText, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { ArrowDown } from 'lucide-react';
import { useRef } from 'react';
import styles from './Hero.module.css';

/**
 * Hero de campaña: cartel de motion graphics construido solo con las marcas planas oficiales
 * (monograma H y estrella), o con la foto/vídeo de campaña cuando exista (`hero.media`).
 *
 * Secuencia de entrada (una vez, al terminar la intro): marcas de corte → barrido de color que
 * descubre el cartel → el monograma sube → la estrella gira hasta su sitio → rótulos y titular.
 * Solo se animan transform, opacity y clip-path.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  // Mientras la intro tapa la página, el hero espera en su estado inicial.
  const ready = useIntro((state) => state.phase !== 'intro');
  const media = hero.media;

  useGSAP(
    (_context, contextSafe) => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const headline = q(`.${styles.headline}`)[0] as HTMLElement;
      const reveals = q('[data-hero-reveal]');
      const poster = q(`.${styles.poster}`);
      const wipe = q(`.${styles.wipe}`);
      const mono = q(`.${styles.mono}`);
      const star = q(`.${styles.star}`);
      const labels = q(`.${styles.label}`);
      const marks = q(`.${styles.cropMark}`);

      if (!ready) {
        gsap.set(labels, { autoAlpha: 0 });
        if (!media) gsap.set(poster, { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(marks, { autoAlpha: 0 });
        return;
      }

      // ── Entrada ──────────────────────────────────────────────────────
      const intro = gsap.timeline({ defaults: { ease: EASE.out } });
      intro.fromTo(marks, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.05 }, 0);
      if (!media) {
        // Barrido de color: un bloque rojo cubre el marco de abajo arriba y sale por arriba.
        intro
          .fromTo(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: EASE.inOut }, 0.1)
          .set(poster, { clipPath: 'inset(0% 0% 0% 0%)' }, 0.6)
          .to(wipe, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.55, ease: EASE.inOut }, 0.6);
      }
      intro
        .from(mono, { yPercent: 22, autoAlpha: 0, duration: 1.2 }, 0.75)
        .from(star, { rotation: -150, scale: 0.7, autoAlpha: 0, duration: 1.3 }, 0.9)
        .fromTo(labels, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06 }, 1.05)
        // Solo desplazamiento: el texto se pinta desde el primer fotograma (no retrasa el LCP).
        .from(reveals, { y: 18, duration: 0.9, stagger: 0.08 }, 0.5)
        .from(q(`.${styles.metaLine}`), { scaleX: 0, duration: 1.2 }, 0.9);

      SplitText.create(headline, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 115, duration: 1.1, ease: EASE.out, stagger: 0.1, delay: 0.35 }),
      });

      // ── Scroll: capas a distinta velocidad y la estrella sigue girando ─
      const scroll = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.to(q(`.${styles.stage}`), { yPercent: -6, ease: 'none', scrollTrigger: scroll });
      gsap.to(mono, { yPercent: 10, ease: 'none', scrollTrigger: scroll });
      gsap.to(q(`.${styles.starSpin}`), { rotation: 120, ease: 'none', scrollTrigger: scroll });

      // ── Puntero fino: paralaje leve por capas (solo transform) ───────
      if (!hasFinePointer() || !contextSafe) return;
      const monoX = gsap.quickTo(q(`.${styles.monoShift}`), 'x', { duration: 0.9, ease: 'power3.out' });
      const monoY = gsap.quickTo(q(`.${styles.monoShift}`), 'y', { duration: 0.9, ease: 'power3.out' });
      const starX = gsap.quickTo(q(`.${styles.starShift}`), 'x', { duration: 1.1, ease: 'power3.out' });
      const starY = gsap.quickTo(q(`.${styles.starShift}`), 'y', { duration: 1.1, ease: 'power3.out' });
      const onMove = contextSafe((event: PointerEvent) => {
        const bounds = root.current!.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        monoX(x * -14);
        monoY(y * -10);
        starX(x * 26);
        starY(y * 20);
      });
      const onLeave = contextSafe(() => {
        monoX(0);
        monoY(0);
        starX(0);
        starY(0);
      });
      const element = root.current;
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      return () => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: root, dependencies: [ready, reduced, media], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={`eyebrow ${styles.eyebrow}`} data-hero-reveal>
            {hero.eyebrow}
          </p>
          <h1 id="hero-title" className={styles.headline}>
            {hero.title}
          </h1>
          <p className={styles.lead} data-hero-reveal>
            {hero.lead}
          </p>
          <div className={styles.ctas} data-hero-reveal>
            <ButtonLink to={hero.primaryCta.to} size="lg" sheen>
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink to={hero.secondaryCta.to} size="lg" variant="outline">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className={styles.stage}>
          <span className={styles.cropMark} data-corner="tl" aria-hidden="true" />
          <span className={styles.cropMark} data-corner="tr" aria-hidden="true" />
          <span className={styles.cropMark} data-corner="bl" aria-hidden="true" />
          <span className={styles.cropMark} data-corner="br" aria-hidden="true" />
          <div className={styles.poster} data-media={media ? 'true' : undefined}>
            {media ? (
              media.type === 'video' && !reduced ? (
                <video className={styles.campaignAsset} src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
              ) : (
                <img
                  src={media.type === 'video' ? media.poster : media.src}
                  alt={media.type === 'image' ? media.alt : ''}
                  className={styles.campaignAsset}
                  fetchPriority="high"
                />
              )
            ) : (
              <>
                <div className={styles.monoShift}>
                  <Monogram className={styles.mono} title="Monograma H de HYPSOS" />
                </div>
                <div className={styles.starShift} aria-hidden="true">
                  <div className={styles.starSpin}>
                    <div className={styles.starIdle}>
                      <Star className={styles.star} />
                    </div>
                  </div>
                </div>
                <span className={styles.label} data-pos="tl">
                  {hero.poster.topLeft}
                </span>
                <span className={styles.label} data-pos="tr">
                  {hero.poster.topRight}
                </span>
                <span className={styles.label} data-pos="bl">
                  {hero.poster.bottomLeft}
                </span>
                <span className={styles.label} data-pos="br">
                  {hero.poster.bottomRight}
                </span>
              </>
            )}
          </div>
          <div className={styles.wipe} aria-hidden="true" />
        </div>
      </div>

      <div className={`container ${styles.meta}`} data-hero-reveal>
        <span>HYPSOS</span>
        <span className={styles.metaLine} aria-hidden="true" />
        <span className={styles.scrollHint}>
          Desliza
          <ArrowDown aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}
