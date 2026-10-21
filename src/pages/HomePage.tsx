import { CategoryIndex } from '@/sections/home/CategoryIndex';
import { Community } from '@/sections/home/Community';
import { FeaturedCollection } from '@/sections/home/FeaturedCollection';
import { Hero } from '@/sections/home/Hero';
import { Manifesto } from '@/sections/home/Manifesto';
import { NewArrivals } from '@/sections/home/NewArrivals';
import { Newsletter } from '@/sections/home/Newsletter';
import { Ticker } from '@/sections/home/Ticker';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <NewArrivals />
      <Manifesto />
      <CategoryIndex />
      <FeaturedCollection />
      <Community />
      <Newsletter />
    </>
  );
}
