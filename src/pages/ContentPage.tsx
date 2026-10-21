import { AboutPage } from '@/content/pages/About';
import { ContactPage } from '@/content/pages/Contact';
import { FaqPage } from '@/content/pages/Faq';
import { LegalPage } from '@/content/pages/Legal';
import { ShippingPage } from '@/content/pages/Shipping';
import { SizeGuidePage } from '@/content/pages/SizeGuidePage';
import { useParams } from 'react-router';
import NotFoundPage from './NotFoundPage';

export default function ContentPage() {
  const { handle } = useParams();
  switch (handle) {
    case 'nosotros':
      return <AboutPage />;
    case 'contacto':
      return <ContactPage />;
    case 'faq':
      return <FaqPage />;
    case 'envios':
      return <ShippingPage />;
    case 'guia-de-tallas':
      return <SizeGuidePage />;
    case 'privacidad':
    case 'terminos':
    case 'cookies':
    case 'aviso-legal':
      return <LegalPage key={handle} handle={handle} />;
    default:
      return <NotFoundPage />;
  }
}
