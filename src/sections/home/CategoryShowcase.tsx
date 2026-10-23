import { CampaignImage } from '@/components/media/CampaignImage';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { ImageReveal } from '@/components/motion/ImageReveal';
import { Scramble } from '@/components/motion/Scramble';
import { SplitHeadline } from '@/components/motion/SplitHeadline';
import { campaignPhotos, type CampaignPhoto } from '@shared/campaign';
import { paths } from '@shared/routes';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './CategoryShowcase.module.css';

const tiles: { handle: string; label: string; photo: CampaignPhoto; focus?: string }[] = [
  { handle: 'sudaderas', label: 'Sudaderas', photo: campaignPhotos.lookHoodie, focus: '50% 30%' },
  { handle: 'camisetas', label: 'Camisetas', photo: campaignPhotos.lookTee, focus: '50% 25%' },
  { handle: 'pantalones', label: 'Pantalones', photo: campaignPhotos.cargo, focus: '50% 60%' },
  { handle: 'gorras', label: 'Gorras', photo: campaignPhotos.cap, focus: '50% 20%' },
  { handle: 'accesorios', label: 'Accesorios', photo: campaignPhotos.accessories },
];

const more = [
  { handle: 'stickers', label: 'Stickers' },
  { handle: '3d', label: 'Piezas 3D' },
  { handle: 'all', label: 'Toda la tienda' },
];

/** Categorías con fotografía de modelos: rejilla asimétrica, el nombre como titular sobre la foto. */
export function CategoryShowcase() {
  return (
    <section className="section" data-theme="dark" aria-labelledby="categories-title">
      <div className="container">
        <div className="section-head">
          <SplitHeadline id="categories-title" className={styles.title}>
            <span className="mix-crushed">Viste la</span> <span className="mix-wide">subida</span>
          </SplitHeadline>
          <p className="eyebrow">
            <Scramble>Categorías</Scramble>
          </p>
        </div>
        <ul role="list" className={styles.grid}>
          {tiles.map((tile, index) => (
            <li key={tile.handle} className={styles.tile} data-index={index}>
              <Link to={paths.collection(tile.handle)} className={styles.link} viewTransition>
                <ImageReveal className={styles.media} parallax={index === 0 ? 8 : 0}>
                  <CampaignImage photo={tile.photo} sizes="(min-width: 1024px) 30vw, 50vw" decorative focus={tile.focus} />
                </ImageReveal>
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.label}>
                  <span className={styles.name}>{tile.label}</span>
                  <LiquidGlass as="span" radius="pill" bezel={12} refraction={14} className={styles.go} aria-hidden="true">
                    <ArrowUpRight />
                  </LiquidGlass>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul role="list" className={styles.more}>
          {more.map((item) => (
            <li key={item.handle}>
              <Link to={paths.collection(item.handle)} className={styles.chip} viewTransition>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
