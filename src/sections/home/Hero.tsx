import { Sticker } from '@/components/brand/Sticker';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ButtonLink } from '@/components/ui/Button';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { generatedImageNotice, hero } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, hasFinePointer, SplitText, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { HERO_SIZES } from '@shared/campaign';
import { paths } from '@shared/routes';
import { Plus } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import styles from './Hero.module.css';

/** Puntos sobre la foto: llevan a la categoría de cada prenda (la foto no muestra un producto concreto). */
const hotspots = [
  { id: 'hoodie', label: 'Sudaderas', to: paths.collection('sudaderas'), x: 57, y: 36 },
  { id: 'cargo', label: 'Pantalones', to: paths.collection('pantalones'), x: 84, y: 76 },
];

/**
 * Hero de campaña: foto a sangre, titular comprimido gigante como objeto («Built for the climb.»,
 * eslogan del Manual), pegatinas de HYPO y la estrella, y puntos interactivos sobre las prendas.
 *
 * Entrada (una vez, al terminar la intro): la foto se descubre y se asienta, el titular sube línea
 * a línea y las pegatinas se «pegan». Después, paralaje moderado y pegatinas que siguen al puntero.
 * Solo transform, opacity y clip-path.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const ready = useIntro((state) => state.phase !== 'intro');
  const { media, photo } = hero;

  useGSAP(
    (_context, contextSafe) => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const frame = q(`.${styles.media}`);
      const image = q(`.${styles.image}`);
      const headline = q(`.${styles.headline}`)[0] as HTMLElement;
      const stickers = q(`.${styles.stickerSlot}`);
      const reveals = q('[data-hero-reveal]');

      if (!ready) {
        gsap.set(frame, { clipPath: 'inset(0% 0% 100% 0%)' });
        gsap.set(stickers, { autoAlpha: 0 });
        return;
      }

      gsap
        .timeline({ defaults: { ease: EASE.out } })
        .fromTo(frame, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3 }, 0)
        .fromTo(image, { scale: 1.18 }, { scale: 1.06, duration: 2 }, 0)
        .from(reveals, { y: 18, duration: 0.9, stagger: 0.07 }, 0.6)
        .fromTo(stickers, { autoAlpha: 0, scale: 1.35 }, { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.12 }, 0.95);

      SplitText.create(headline, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1.1, ease: EASE.out, stagger: 0.1, delay: 0.35 }),
      });

      // Paralaje: la foto baja más despacio que la página; el titular sube un poco.
      const scroll = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.to(image, { yPercent: 6, ease: 'none', scrollTrigger: scroll });
      gsap.to(headline, { yPercent: -10, ease: 'none', scrollTrigger: scroll });

      if (!hasFinePointer() || !contextSafe) return;
      const movers = stickers.map((sticker, index) => ({
        x: gsap.quickTo(sticker, 'x', { duration: 1, ease: 'power3.out' }),
        y: gsap.quickTo(sticker, 'y', { duration: 1, ease: 'power3.out' }),
        depth: index % 2 ? -18 : 24,
      }));
      const onMove = contextSafe((event: PointerEvent) => {
        const bounds = root.current!.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        movers.forEach((mover) => {
          mover.x(x * mover.depth);
          mover.y(y * mover.depth);
        });
      });
      const element = root.current;
      element.addEventListener('pointermove', onMove);
      return () => element.removeEventListener('pointermove', onMove);
    },
    { scope: root, dependencies: [ready, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.hero} data-theme="dark" aria-labelledby="hero-title">
      <div className={styles.media}>
        {media ? (
          media.type === 'video' && !reduced ? (
            <video className={styles.image} src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
          ) : (
            <img src={media.type === 'video' ? media.poster : media.src} alt={media.type === 'image' ? media.alt : ''} className={styles.image} fetchPriority="high" />
          )
        ) : (
          <CampaignImage photo={photo} sizes={HERO_SIZES} className={styles.image} priority focus="62% 40%" />
        )}
        <span className={styles.scrim} aria-hidden="true" />
        {!media && (
          // Capa con la misma proporción y encuadre que la foto: los puntos quedan sobre las prendas.
          <div className={styles.hotspots}>
            {hotspots.map((spot) => (
              <LiquidGlass
                as={Link}
                key={spot.id}
                to={spot.to}
                radius="pill"
                bezel={10}
                refraction={12}
                interactive
                className={styles.hotspot}
                data-spot={spot.id}
                style={{ '--x': `${spot.x}%`, '--y': `${spot.y}%` } as CSSProperties}
                viewTransition
              >
                <Plus aria-hidden="true" />
                <span className={styles.hotspotLabel}>{spot.label}</span>
              </LiquidGlass>
            ))}
          </div>
        )}
      </div>

      <div className={`container ${styles.content}`}>
        <LiquidGlass as="p" radius="pill" bezel={10} refraction={12} className={styles.chapter} data-hero-reveal>
          <span className={styles.chapterDot} aria-hidden="true" />
          {hero.chapter}
        </LiquidGlass>

        <div className={styles.titleBlock}>
          <h1 id="hero-title" className={styles.headline}>
            {hero.title}
          </h1>
          <span className={`${styles.stickerSlot} ${styles.stickerMascot}`} aria-hidden="true">
            <Sticker mark="mascot" rotate={-9} className={styles.sticker} />
          </span>
          <span className={`${styles.stickerSlot} ${styles.stickerStar}`} aria-hidden="true">
            <Sticker mark="star" color="#d71920" rotate={-4} className={styles.sticker} />
          </span>
        </div>

        <div className={styles.footer}>
          <p className={styles.lead} data-hero-reveal>
            {hero.lead}
          </p>
          <div className={styles.ctas} data-hero-reveal>
            <ButtonLink to={hero.primaryCta.to} size="lg">
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink to={hero.secondaryCta.to} size="lg" variant="outline">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
        {!media && (
          <p className={styles.credit} data-hero-reveal>
            {generatedImageNotice}
          </p>
        )}
      </div>
    </section>
  );
}
