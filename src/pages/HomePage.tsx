import { CategoryShowcase } from '@/sections/home/CategoryShowcase';
import { ChapterDrop } from '@/sections/home/ChapterDrop';
import { Editorial } from '@/sections/home/Editorial';
import { Hero } from '@/sections/home/Hero';
import { LimitedDrop } from '@/sections/home/LimitedDrop';
import { Manifesto } from '@/sections/home/Manifesto';
import { Signature } from '@/sections/home/Signature';

/**
 * Portada por bandas a sangre (Manual: negro dominante, rojo como señal, blanco roto):
 * campaña (negro) → Chapter 01 (claro) → categorías con modelos (negro) → lookbook y detalle firma
 * (claro) → cápsula (rojo, una vez) → manifiesto (negro) → newsletter y pie.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ChapterDrop />
      <CategoryShowcase />
      <Editorial />
      <Signature />
      <LimitedDrop />
      <Manifesto />
    </>
  );
}
