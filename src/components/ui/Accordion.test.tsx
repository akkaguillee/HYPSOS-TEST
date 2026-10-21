import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion } from './Accordion';

describe('Accordion', () => {
  it('expone el estado con aria-expanded y alterna paneles', async () => {
    render(
      <Accordion
        defaultOpen={['a']}
        items={[
          { id: 'a', title: 'Primero', content: 'Uno' },
          { id: 'b', title: 'Segundo', content: 'Dos' },
        ]}
      />,
    );
    const first = screen.getByRole('button', { name: 'Primero' });
    const second = screen.getByRole('button', { name: 'Segundo' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Segundo' })).toHaveTextContent('Dos');
  });
});
