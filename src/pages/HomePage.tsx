import { Ticker } from '@/components/brand/Ticker';
import { ticker } from '@/content/campaign';
import { CategoryIndex } from '@/sections/home/CategoryIndex';
import { ChapterDrop } from '@/sections/home/ChapterDrop';
import { Editorial } from '@/sections/home/Editorial';
import { Hero } from '@/sections/home/Hero';
import { LimitedDrop } from '@/sections/home/LimitedDrop';
import { Manifesto } from '@/sections/home/Manifesto';
import { Signature } from '@/sections/home/Signature';

/**
 * Portada por bandas a sangre que alternan oscuro y claro (Shelby), con la foto editorial sin
 * texto encima (21 TSI) y un solo color de acción (Cake):
 * hero negro → banda roja en bucle → Chapter 01 (blanco) → índice de categorías (negro) →
 * lookbook (blanco) → la señal roja → cápsula Signal con tarjeta oscura (blanco) →
 * manifiesto (negro) → pie.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker items={ticker.items} label={ticker.label} />
      <ChapterDrop />
      <CategoryIndex />
      <Editorial />
      <Signature />
      <LimitedDrop />
      <Manifesto />
    </>
  );
}
