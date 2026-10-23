import { Sticker } from '@/components/brand/Sticker';
import { GraffitiTag } from '@/components/graffiti/GraffitiTag';
import { SprayMark } from '@/components/graffiti/SprayMark';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ButtonLink } from '@/components/ui/Button';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { generatedImageNotice, hero } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, pressIn, slap, SplitText, useGSAP } from '@/lib/motion';
import { createSprayReveal } from '@/lib/spray';
import { useIntro } from '@/store/intro';
import { HERO_SIZES } from '@shared/campaign';
import { paths } from '@shared/routes';
import { Plus } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import styles from './Hero.module.css';

/** Puntos sobre la foto: llevan a la categoría de cada prenda (la foto no muestra un producto concreto). */
const hotspots = [
  { id: 'hoodie', label: 'Sudaderas', to: paths.collection('sudaderas'), x: 22, y: 27 },
  { id: 'tee', label: 'Camisetas', to: paths.collection('camisetas'), x: 74, y: 33 },
  { id: 'cargo', label: 'Pantalones', to: paths.collection('pantalones'), x: 70, y: 57 },
];

type Cue = 'tag' | 'underline';

/**
 * Los trazos (tag y subrayado) crean su animación por su cuenta —y la recrean al cargar la
 * fuente—; el hero decide cuándo suenan. Si una animación llega tarde, suena al registrarse.
 */
function createCues() {
  const timelines: Partial<Record<Cue, gsap.core.Timeline>> = {};
  const fired = new Set<Cue>();
  return {
    register: (cue: Cue) => (timeline: gsap.core.Timeline) => {
      timelines[cue] = timeline;
      if (fired.has(cue)) timeline.play();
    },
    fire: (cue: Cue) => {
      fired.add(cue);
      timelines[cue]?.play();
    },
  };
}

/**
 * Hero de campaña: foto a sangre del túnel con graffiti y un titular de dos anchos —«Built for»
 * comprimida y «the climb.» ancha— con el capítulo pintado a espray encima, un subrayado que gotea
 * y dos pegatinas estampadas.
 *
 * Secuencia (una vez): la foto se pinta a espray (o la descubre la intro), la etiqueta se
 * decodifica, las letras se prensan, se pinta el tag, se traza el subrayado, gotea y se pegan las
 * pegatinas con un golpe. Después: paralaje y pegatinas que siguen al puntero.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const sprayCanvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const ready = useIntro((state) => state.phase !== 'intro');
  // Si la intro está en marcha al montar, ella descubre la foto (no se pinta dos veces).
  const introCovers = useRef(useIntro.getState().phase === 'intro');
  const [cues] = useState(createCues);
  const { media, photo } = hero;

  useGSAP(
    (_context, contextSafe) => {
      if (reduced || !root.current) return;
      const q = gsap.utils.selector(root);
      const image = q(`.${styles.image}`);
      const headline = q(`.${styles.headline}`)[0] as HTMLElement;
      const stickers = q(`.${styles.stickerSlot}`) as HTMLElement[];
      const spots = q(`.${styles.hotspot}`);
      const ctas = q(`.${styles.ctas} > *`);
      const chapter = q(`.${styles.chapterText}`)[0] as HTMLElement | undefined;
      gsap.set(stickers, { autoAlpha: 0 });
      gsap.set(spots, { scale: 0 });

      const split = SplitText.create(headline, { type: 'words,chars', wordsClass: 'split-word', charsClass: 'split-char' });
      gsap.set(split.chars, { scaleY: 0 });
      gsap.set(ctas, { scaleY: 0, transformOrigin: '50% 100%' });

      // La foto se pinta a espray si no lo hace la intro.
      const spray = !introCovers.current && sprayCanvas.current ? createSprayReveal(sprayCanvas.current, { color: '#090909', duration: 1.4, passes: 5, seed: 21 }) : null;
      spray?.cover();
      if (!ready) return () => split.revert();

      const start = spray ? 0.55 : 0.05;
      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      if (spray) {
        spray.timeline.paused(false);
        tl.add(spray.timeline, 0);
      }
      tl.fromTo(image, { scale: 1.16 }, { scale: 1.06, duration: 2.4, ease: 'expo.out' }, 0);
      if (chapter) tl.to(chapter, { duration: 0.8, ease: 'none', scrambleText: { text: hero.chapter, chars: '01/\\_▮▯█', speed: 0.7 } }, start);
      tl.add(pressIn(split.chars, { stagger: { each: 0.03, from: 'start' } }), start + 0.1);
      tl.call(() => cues.fire('tag'), [], start + 0.75);
      tl.call(() => cues.fire('underline'), [], start + 1.05);
      tl.add(slap(stickers, { impact: q(`.${styles.titleBlock}`)[0] }), start + 1.35);
      tl.fromTo(ctas, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: EASE.press, stagger: 0.08, immediateRender: false }, start + 0.9);
      tl.fromTo(spots, { scale: 0 }, { scale: 1, duration: 0.6, ease: EASE.slap, stagger: 0.12, immediateRender: false }, start + 1.5);

      // Paralaje: la foto baja más despacio que la página; el titular sube un poco.
      const scroll = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.to(image, { yPercent: 6, ease: 'none', scrollTrigger: scroll });
      gsap.to(headline, { yPercent: -10, ease: 'none', scrollTrigger: scroll });

      const cleanup = () => {
        split.revert();
        spray?.destroy();
      };
      if (!contextSafe || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return cleanup;
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
      return () => {
        element.removeEventListener('pointermove', onMove);
        cleanup();
      };
    },
    { scope: root, dependencies: [ready, reduced], revertOnUpdate: true },
  );

  const [lineA, lineB] = hero.titleLines;
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
          <CampaignImage photo={photo} sizes={HERO_SIZES} className={styles.image} priority focus="50% 42%" />
        )}
        <span className={styles.scrim} aria-hidden="true" />
        {!reduced && <canvas ref={sprayCanvas} className={styles.spray} aria-hidden="true" />}
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
        <LiquidGlass as="p" radius="pill" bezel={10} refraction={12} className={styles.chapter}>
          <span className={styles.chapterDot} aria-hidden="true" />
          <span className={styles.chapterText}>{hero.chapter}</span>
        </LiquidGlass>

        <div className={styles.titleBlock}>
          <h1 id="hero-title" className={styles.headline}>
            <span className={styles.lineCrushed}>{lineA}</span> <span className={styles.lineWide}>{lineB}</span>
          </h1>
          <GraffitiTag className={styles.tag} trigger="manual" onReady={cues.register('tag')}>
            {hero.tag}
          </GraffitiTag>
          <SprayMark variant="underline" drips trigger="manual" className={styles.underline} onReady={cues.register('underline')} />
          <span className={`${styles.stickerSlot} ${styles.stickerMascot}`} aria-hidden="true">
            <Sticker mark="mascot" rotate={-9} className={styles.sticker} />
          </span>
          <span className={`${styles.stickerSlot} ${styles.stickerStar}`} aria-hidden="true">
            <Sticker mark="star" color="#d71920" rotate={-4} className={styles.sticker} />
          </span>
        </div>

        <div className={styles.footer}>
          <p className={styles.lead}>{hero.lead}</p>
          <div className={styles.actions}>
            <p className={styles.note} aria-hidden="true">
              {hero.note} ↓
            </p>
            <div className={styles.ctas}>
              <ButtonLink to={hero.primaryCta.to} size="lg" data-magnetic="">
                {hero.primaryCta.label}
              </ButtonLink>
              <ButtonLink to={hero.secondaryCta.to} size="lg" variant="outline" data-magnetic="">
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>
          </div>
        </div>
        {!media && <p className={styles.credit}>{generatedImageNotice}</p>}
      </div>
    </section>
  );
}
