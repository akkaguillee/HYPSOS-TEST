import { Mascot, Star } from '@/components/brand/BrandVector';
import { ChromeMonogram } from '@/components/brand/ChromeMonogram';
import { Reveal } from '@/components/motion/Reveal';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { ThreeStage } from '@/components/three/ThreeStage';
import { ButtonLink } from '@/components/ui/Button';
import { paths } from '@shared/routes';
import { Link } from 'react-router';
import styles from './BrandLab.module.css';

/**
 * Laboratorio de diseño gráfico y 3D: el monograma oficial extruido en tiempo real
 * (no es un producto) junto a los gráficos de marca que dan vida a stickers y piezas 3D.
 */
export function BrandLab() {
  return (
    <section className={`section ${styles.section}`} aria-labelledby="lab-title">
      <div className="container">
        <div className={styles.grid}>
          <ThreeStage
            source={{ kind: 'monogram' }}
            label="Monograma H de HYPSOS en 3D"
            className={styles.stage}
            poster={<ChromeMonogram sizes="(min-width: 1024px) 55vw, 100vw" alt="" />}
          />
          <div className={styles.copy}>
            <p className="eyebrow">Laboratorio</p>
            <SplitHeadline id="lab-title" className="t-display">
              Gráfico. Volumen. Señal.
            </SplitHeadline>
            <Reveal>
              <p className="t-lead">
                El monograma H, la estrella y el personaje son el sistema gráfico de HYPSOS. Aquí se convierten en volumen, en vinilo y en piezas para
                coleccionar.
              </p>
            </Reveal>
            <Reveal className={styles.marks} index={1}>
              <Link to={paths.collection('stickers')} className={styles.mark} viewTransition>
                <Star className={styles.markStar} />
                <span className={styles.markLabel}>Stickers</span>
              </Link>
              <Link to={paths.collection('3d')} className={styles.mark} viewTransition>
                <Mascot className={styles.markMascot} />
                <span className={styles.markLabel}>Piezas 3D</span>
              </Link>
            </Reveal>
            <Reveal className={styles.actions} index={2}>
              <ButtonLink to={paths.collection('3d')} variant="outline">
                Explorar 3D
              </ButtonLink>
              <ButtonLink to={paths.page('nosotros')} variant="ghost">
                Sobre HYPSOS
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
