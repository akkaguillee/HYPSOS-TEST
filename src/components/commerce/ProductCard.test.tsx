import { useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { getProductByHandle } from '@shared/catalog';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductCard } from './ProductCard';

const renderCard = (handle: string) =>
  render(
    <MemoryRouter>
      <ProductCard product={getProductByHandle(handle)!} />
    </MemoryRouter>,
  );

describe('ProductCard', () => {
  beforeEach(() => {
    useCart.setState({ lines: [], isOpen: false });
    useWishlist.setState({ productIds: [] });
  });

  it('muestra nombre, precio, etiquetas y enlace a la ficha', () => {
    renderCard('sudadera-capucha-cromo');
    const link = screen.getByRole('link', { name: 'Sudadera Capucha Cromo' });
    expect(link).toHaveAttribute('href', '/products/sudadera-capucha-cromo');
    expect(screen.getByText('Edición limitada')).toBeInTheDocument();
    expect(screen.getByText(/95,00/)).toBeInTheDocument();
  });

  it('identifica la imagen como marcador de posición', () => {
    renderCard('gorra-monogram');
    expect(screen.getAllByRole('img', { name: /Imagen pendiente/ })[0]).toBeInTheDocument();
  });

  it('el añadido rápido usa la talla elegida y abre el carrito', async () => {
    renderCard('camiseta-ascenso-heavyweight');
    await userEvent.click(screen.getByRole('button', { name: /Añadir Camiseta Ascenso Heavyweight, Negro, talla L$/ }));
    expect(useCart.getState().lines[0]).toMatchObject({ productId: 'p-tee-ascenso', colorId: 'negro', size: 'L', quantity: 1 });
    expect(useCart.getState().isOpen).toBe(true);
  });

  it('desactiva tallas agotadas y cambia de color', async () => {
    renderCard('camiseta-ascenso-heavyweight');
    await userEvent.click(screen.getByRole('button', { name: 'Ver en Blanco' }));
    expect(screen.getByRole('button', { name: /talla XS \(agotada\)/ })).toBeDisabled();
  });

  it('guarda y quita de favoritos', async () => {
    renderCard('gorra-monogram');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Gorra Monogram en favoritos' }));
    expect(useWishlist.getState().productIds).toEqual(['p-cap-monogram']);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Gorra Monogram de favoritos' }));
    expect(useWishlist.getState().productIds).toEqual([]);
  });
});
