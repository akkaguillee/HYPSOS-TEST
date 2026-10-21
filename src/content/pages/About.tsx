import { Mascot, Monogram, Star } from '@/components/brand/BrandVector';
import { BrandPanel } from '@/components/brand/BrandPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Parallax } from '@/components/motion/Parallax';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ButtonLink } from '@/components/ui/Button';
import { paths } from '@shared/routes';
import styles from './About.module.css';

// TEXTOS EN BORRADOR: validar con HYPSOS. No incluyen datos factuales (fechas, lugares, nombres).
const chapters = [
  {
    title: 'El nombre',
    text: 'ὕψος significa altura en griego. Para nosotros es una dirección: subir el nivel cada día, en el entrenamiento, en la calle y en lo que creamos.',
  },
  {
    title: 'Lo que hacemos',
    text: 'Ropa de calle y entrenamiento con identidad propia. Siluetas amplias, tejidos con peso y gráficos que significan algo para quien los lleva.',
  },
  {
    title: 'Cómo lo hacemos',
    text: 'En tiradas cortas. Preferimos que una pieza se agote a llenar almacenes. Cuidamos el patrón, el gramaje y cada acabado antes de lanzar un drop.',
  },
];

export function AboutPage() {
  return (
    <>
      <PageHeader
        variant="campaign"
        eyebrow="HYPSOS"
        title="Quiénes somos"
        description="Una marca de streetwear construida alrededor de una idea: estar por encima del ruido."
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Quiénes somos' }]}
      />

      <section className={styles.visualSection}>
        <Reveal variant="mask" className={styles.visual}>
          <Parallax className={styles.visualInner} amount={7}>
            <BrandPanel tone="red" mark="wordmark" accent className={styles.banner} />
          </Parallax>
        </Reveal>
      </section>

      <section className="section">
        <div className={`container ${styles.chapters}`}>
          {chapters.map((chapter, index) => (
            <Reveal key={chapter.title} className={styles.chapter} index={index}>
              <span className={styles.chapterIndex}>{String(index + 1).padStart(2, '0')}</span>
              <h2 className="t-h3">{chapter.title}</h2>
              <p className="t-muted">{chapter.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section" data-theme="light">
        <div className={`container ${styles.marks}`}>
          <div className={styles.marksCopy}>
            <p className="eyebrow">Sistema de marca</p>
            <SplitHeadline className="t-h2">Tres símbolos, una actitud</SplitHeadline>
            <p className="t-muted">
              El monograma H, la estrella y el personaje aparecen en las prendas, en los stickers y en cada drop. Cada uno cuenta una parte de HYPSOS.
            </p>
          </div>
          <ul role="list" className={styles.markList}>
            <Reveal as="li" className={styles.markItem} index={0}>
              <Monogram className={styles.markMonogram} />
              <span className="t-label">Monograma</span>
            </Reveal>
            <Reveal as="li" className={styles.markItem} index={1}>
              <Star className={styles.markStar} />
              <span className="t-label">Estrella</span>
            </Reveal>
            <Reveal as="li" className={`${styles.markItem} ${styles.markDark}`} index={2}>
              <Mascot className={styles.markMascot} />
              <span className="t-label">Personaje</span>
            </Reveal>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className={`container ${styles.cta}`}>
          <SplitHeadline className="t-display">Únete al próximo drop</SplitHeadline>
          <div className={styles.ctaActions}>
            <ButtonLink to={paths.collection('novedades')} size="lg" sheen>
              Ver novedades
            </ButtonLink>
            <ButtonLink to={paths.page('contacto')} size="lg" variant="outline">
              Hablemos
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
