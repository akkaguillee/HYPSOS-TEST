import { TapeMarquee } from '@/components/graffiti/TapeMarquee';
import { tapes } from '@/content/campaign';
import { CategoryShowcase } from '@/sections/home/CategoryShowcase';
import { ChapterDrop } from '@/sections/home/ChapterDrop';
import { Editorial } from '@/sections/home/Editorial';
import { Hero } from '@/sections/home/Hero';
import { LimitedDrop } from '@/sections/home/LimitedDrop';
import { Signature } from '@/sections/home/Signature';
import { TheWall } from '@/sections/home/TheWall';
import styles from './HomePage.module.css';

/**
 * Portada por bandas a sangre (Manual: negro dominante, rojo como señal, blanco roto):
 * campaña en el túnel (negro) → cintas cruzadas sobre el corte → Chapter 01 (claro) → categorías
 * con modelos (negro) → lookbook y detalle firma (claro) → cápsula (rojo, una vez) → el muro:
 * manifiesto pintado a espray (negro) → newsletter y pie.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TapeMarquee className={styles.tapes} top={tapes.top} bottom={tapes.bottom} label={tapes.label} />
      <ChapterDrop />
      <CategoryShowcase />
      <Editorial />
      <Signature />
      <LimitedDrop />
      <TheWall />
    </>
  );
}
