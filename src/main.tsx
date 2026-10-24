import '@/styles/index.css';
import { loadAccentFont } from '@/lib/fonts';
import { router } from '@/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

loadAccentFont();

const container = document.getElementById('root')!;
// Retira la pantalla de carga estática de index.html: React toma el control.
container.replaceChildren();

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
