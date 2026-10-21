import { BrandLab } from '@/sections/home/BrandLab';
import { CategoryIndex } from '@/sections/home/CategoryIndex';
import { FeaturedCollections } from '@/sections/home/FeaturedCollections';
import { FeaturedProducts } from '@/sections/home/FeaturedProducts';
import { Hero } from '@/sections/home/Hero';
import { Manifesto } from '@/sections/home/Manifesto';
import { NewArrivals } from '@/sections/home/NewArrivals';
import { Newsletter } from '@/sections/home/Newsletter';
import { Ticker } from '@/sections/home/Ticker';

/**
 * Portada: campaña → colecciones → novedades → destacados → categorías → editorial →
 * laboratorio gráfico/3D → newsletter. Se alternan bloques oscuros y pausas en claro.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <FeaturedCollections />
      <NewArrivals />
      <FeaturedProducts />
      <CategoryIndex />
      <Manifesto />
      <BrandLab />
      <Newsletter />
    </>
  );
}
