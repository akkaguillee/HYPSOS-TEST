import { BootScreen } from '@/components/layout/BootScreen';
import { Layout } from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import { RouteError } from '@/pages/RouteError';
import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

/** Las páginas secundarias se cargan bajo demanda para que la portada sea lo más ligera posible. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

// Un alojamiento estático puede servir /ruta/ con barra final: la web usa siempre /ruta.
// Debe ocurrir antes de crear el router, que lee la URL al inicializarse.
if (typeof window !== 'undefined' && window.location.pathname.length > 1 && window.location.pathname.endsWith('/')) {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname.replace(/\/+$/, '')}${search}${hash}`);
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    ErrorBoundary: RouteError,
    HydrateFallback: BootScreen,
    children: [
      { index: true, Component: HomePage },
      { path: 'collections/:handle', lazy: page(() => import('@/pages/CollectionPage')) },
      { path: 'products/:handle', lazy: page(() => import('@/pages/ProductPage')) },
      { path: 'pages/:handle', lazy: page(() => import('@/pages/ContentPage')) },
      { path: 'cart', lazy: page(() => import('@/pages/CartPage')) },
      { path: 'checkout', lazy: page(() => import('@/pages/CheckoutPage')) },
      { path: 'checkout/success', lazy: page(() => import('@/pages/CheckoutSuccessPage')) },
      { path: 'search', lazy: page(() => import('@/pages/SearchPage')) },
      { path: 'favoritos', lazy: page(() => import('@/pages/WishlistPage')) },
      { path: 'cuenta/*', lazy: page(() => import('@/pages/account/AccountPage')) },
      { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
    ],
  },
]);
