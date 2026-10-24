import { Mascot, Monogram, Star } from '@/components/brand/BrandVector';
import { CampaignImage } from '@/components/media/CampaignImage';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { generatedImageNotice } from '@/content/campaign';
import { campaignPhotos } from '@shared/campaign';
import { paths } from '@shared/routes';
import styles from './About.module.css';

// Textos del Manual de Marca HYPSOS (estrategia, valores y biografía). Sin datos inventados.
const values = [
  { title: 'Ascensión', text: 'Seguir siempre hacia arriba: la marca celebra el progreso en lugar de la perfección.' },
  { title: 'Identidad', text: 'Prendas que ayudan a expresar quién eres sin necesitar una explicación ruidosa.' },
  { title: 'Oficio', text: 'El fit, el tejido, la impresión, el bordado y los acabados importan tanto como el gráfico.' },
  { title: 'Valentía', text: 'Campañas y textos que desafían la zona de confort sin caer en agresividad vacía.' },
  { title: 'Pertenencia', text: 'Quien lleva HYPSOS forma parte de un universo compartido, no solo de una compra.' },
  { title: 'Evolución', text: 'Cada drop añade un capítulo nuevo y conserva los códigos centrales de HYPSOS.' },
];

export function AboutPage() {
  return (
    <>
      <section className={styles.hero} data-theme="dark" aria-labelledby="about-title">
        <ImageReveal className={styles.heroMedia} from="bottom" parallax={8}>
          <CampaignImage photo={campaignPhotos.crew} sizes="100vw" priority focus="30% 50%" />
        </ImageReveal>
        <div className={`container ${styles.heroContent}`}>
          <Breadcrumbs items={[{ label: 'Inicio', to: paths.home }, { label: 'Quiénes somos' }]} />
          <p className="eyebrow">Sobre HYPSOS / Movimiento</p>
          {/* «The» pequeña y «Ascent» como acento: el nombre del movimiento como un rótulo. */}
          <SplitHeadline as="h1" id="about-title" trigger="mount" className={styles.heroTitle}>
            <span className={styles.heroSmall}>The</span> <span className={styles.heroAccent}>Ascent</span>
          </SplitHeadline>
          <p className={styles.heroLead}>
            HYPSOS es una marca streetwear independiente construida alrededor de una idea: seguir subiendo. Prendas premium para el día a día, gráficos
            potentes y un sistema visual basado en capítulos que convierte el progreso personal en algo que puedes vestir.
          </p>
          <p className={styles.credit}>{generatedImageNotice}</p>
        </div>
      </section>

      <section className="section" data-theme="light" aria-labelledby="values-title">
        <div className="container">
          <div className="section-head">
            <SplitHeadline id="values-title" className="t-h2">
              Valores de marca
            </SplitHeadline>
            <p className="eyebrow">Built for the climb.</p>
          </div>
          <ol className={styles.values}>
            {values.map((value, index) => (
              <Reveal as="li" key={value.title} className={styles.value} index={index % 3}>
                <span className={styles.code}>{String(index + 1).padStart(2, '0')}</span>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueText}>{value.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" data-theme="dark" aria-labelledby="hypo-title">
        <div className={`container ${styles.hypo}`}>
          <div className={styles.hypoArt}>
            <Mascot className={styles.hypoSticker} title="HYPO, la mascota de HYPSOS" />
            <Star className={styles.hypoStar} />
            <Monogram className={styles.hypoMono} />
          </div>
          <div className={styles.hypoCopy}>
            <p className="eyebrow">Mascota</p>
            <SplitHeadline id="hypo-title" className="t-display">
              HYPO
            </SplitHeadline>
            <p className={styles.text}>
              El rostro reconocible de la marca, usado como personaje y no como simple logo decorativo. Aparece en gráficos, stickers, piezas limitadas y
              packaging, siempre separado del logotipo principal.
            </p>
            <p className={styles.text}>
              Junto a él, el monograma H y la estrella completan el sistema: tres símbolos con los que reconocer HYPSOS sin ver el nombre.
            </p>
          </div>
        </div>
      </section>

      <section className="section" data-theme="red" aria-labelledby="about-cta">
        <div className={`container ${styles.cta}`}>
          <SplitHeadline id="about-cta" className={styles.ctaTitle}>
            Keep climbing.
          </SplitHeadline>
          <div className={styles.ctaActions}>
            <ButtonLink to={paths.collection('drop-01-ascenso')} size="lg">
              Ver Chapter 01
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
