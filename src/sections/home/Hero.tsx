import { CampaignImage } from '@/components/media/CampaignImage';
import { ButtonLink } from '@/components/ui/Button';
import { generatedImageNotice, hero } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, pressIn, SplitText, stamp, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { HERO_SIZES } from '@shared/campaign';
import { paths } from '@shared/routes';
import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import styles from './Hero.module.css';

/** Puntos sobre la foto: llevan a la categoría de cada prenda (la foto no muestra un producto concreto). */
const hotspots = [
  { id: 'hoodie', label: 'Sudaderas', to: paths.collection('sudaderas'), x: 57, y: 31 },
  { id: 'cargo', label: 'Pantalones', to: paths.collection('pantalones'), x: 81, y: 72 },
];

/** Encuadre de la foto (object-position): la capa de puntos usa el mismo. */
const FOCUS = { x: 0.62, y: 0.2 };

/**
 * Hero de campaña en dos tiempos, como un editorial de moda:
 * 1. La foto a sangre, sola (sin texto encima): solo dos puntos discretos que llevan a la
 *    categoría de cada prenda.
 * 2. Debajo, sobre negro, el titular centrado en Bastaman con la palabra del capítulo encajada en
 *    medio («Built for · Ascent · the climb.»), la entradilla y las dos acciones.
 *
 * Movimiento: la foto se abre desde el centro como un diafragma (o la descubre el iris de la
 * intro); las letras se prensan; la palabra de acento cae como un sello. Al hacer scroll, la foto
 * se recoge en una tarjeta con esquinas redondeadas mientras el titular sube.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const ready = useIntro((state) => state.phase !== 'intro');
  // Si la intro está en marcha al montar, ella descubre la foto (no se abre dos veces).
  const introCovers = useRef(useIntro.getState().phase === 'intro');
  const { media, photo } = hero;

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      // La <picture> es `display: contents`: se anima la <img> (o el vídeo) que contiene.
      const image = (q(`.${styles.image} img`)[0] ?? q(`.${styles.image}`)[0]) as HTMLElement | undefined;
      const frame = q(`.${styles.frame}`)[0] as HTMLElement | undefined;
      const lines = q(`.${styles.line}`) as HTMLElement[];
      const accent = q(`.${styles.accent}`)[0] as HTMLElement | undefined;
      const spots = q(`.${styles.hotspot}`);
      const ctas = q(`.${styles.ctas} > *`);
      const chapter = q(`.${styles.chapterText}`)[0] as HTMLElement | undefined;

      const split = SplitText.create(lines, { type: 'chars', charsClass: 'split-char' });
      gsap.set(split.chars, { scaleY: 0 });
      gsap.set(ctas, { scaleY: 0, transformOrigin: '50% 100%' });
      gsap.set(spots, { scale: 0 });
      if (accent) gsap.set(accent, { autoAlpha: 0 });
      // El margen de escala se recorta por abajo: las cabezas, arriba, no quedan bajo la cabecera.
      if (image) gsap.set(image, { scale: 1.06, transformOrigin: `${FOCUS.x * 100}% 0%` });

      // Sin intro: la foto se abre desde el centro. Valores explícitos en ambos extremos (fromTo):
      // el navegador abrevia el inset leído y GSAP no podría interpolarlo número a número.
      const aperture = !introCovers.current && frame;
      const closed = 'inset(24% 30% 24% 30% round 40px)';
      if (aperture) gsap.set(frame, { clipPath: closed });
      if (!ready) return () => split.revert();

      const start = aperture ? 0.7 : 0.05;
      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      if (aperture) tl.fromTo(frame, { clipPath: closed }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' }, 0);
      if (image) tl.fromTo(image, { scale: aperture ? 1.4 : 1.16 }, { scale: 1.06, duration: aperture ? 1.8 : 1.5, ease: 'expo.inOut' }, 0);
      if (chapter) tl.to(chapter, { duration: 0.8, ease: 'none', scrambleText: { text: hero.chapter, chars: '01/\\_', speed: 0.7 } }, start);
      tl.add(pressIn(split.chars, { stagger: { each: 0.028, from: 'start' } }), start + 0.1);
      if (accent) tl.add(stamp(accent, { rotation: -18 }), start + 0.75);
      tl.fromTo(ctas, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: EASE.press, stagger: 0.08, immediateRender: false }, start + 0.9);
      tl.fromTo(spots, { scale: 0 }, { scale: 1, duration: 0.6, ease: EASE.stamp, stagger: 0.14, immediateRender: false }, start + 1.2);

      // Scroll: la foto se recoge en una tarjeta (márgenes y esquinas) y se acerca un poco menos.
      if (frame) {
        const scroll = { trigger: frame, start: 'top top', end: 'bottom top', scrub: 0.5 };
        gsap.fromTo(
          frame,
          { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
          { clipPath: 'inset(0% 3% 6% 3% round 28px)', ease: 'none', immediateRender: false, scrollTrigger: scroll },
        );
        if (image) gsap.to(image, { yPercent: 8, ease: 'none', scrollTrigger: scroll });
      }
      return () => split.revert();
    },
    { scope: root, dependencies: [ready, reduced], revertOnUpdate: true },
  );

  const [lineA, lineB] = hero.titleLines;
  return (
    <section ref={root} className={styles.hero} data-theme="dark" aria-labelledby="hero-title">
      <div className={styles.frame}>
        <div className={styles.media}>
          {media ? (
            media.type === 'video' && !reduced ? (
              <video className={styles.image} src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
            ) : (
              <img src={media.type === 'video' ? media.poster : media.src} alt={media.type === 'image' ? media.alt : ''} className={styles.image} fetchPriority="high" />
            )
          ) : (
            <CampaignImage photo={photo} sizes={HERO_SIZES} className={styles.image} priority focus={`${FOCUS.x * 100}% ${FOCUS.y * 100}%`} />
          )}
          {!media && (
            // Capa con la misma proporción y encuadre que la foto: los puntos quedan sobre las prendas.
            <div className={styles.hotspots} style={{ '--fx': FOCUS.x, '--fy': FOCUS.y } as CSSProperties}>
              {hotspots.map((spot) => (
                <Link
                  key={spot.id}
                  to={spot.to}
                  className={styles.hotspot}
                  data-spot={spot.id}
                  style={{ '--x': `${spot.x}%`, '--y': `${spot.y}%` } as CSSProperties}
                  viewTransition
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <span>{spot.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        {!media && <p className={styles.credit}>{generatedImageNotice}</p>}
      </div>

      <div className={`container ${styles.content}`}>
        <p className={styles.chapter}>
          <span className={styles.chapterDot} aria-hidden="true" />
          <span className={styles.chapterText}>{hero.chapter}</span>
        </p>
        <h1 id="hero-title" className={styles.headline}>
          <span className={styles.line}>{lineA}</span>{' '}
          <span className={styles.accent} aria-hidden="true">
            {hero.accent}
          </span>
          <span className={styles.line}>{lineB}</span>
        </h1>
        <p className={styles.lead}>{hero.lead}</p>
        <div className={styles.ctas}>
          <ButtonLink to={hero.primaryCta.to} size="lg" data-magnetic="">
            {hero.primaryCta.label}
          </ButtonLink>
          <ButtonLink to={hero.secondaryCta.to} size="lg" variant="outline" data-magnetic="">
            {hero.secondaryCta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
