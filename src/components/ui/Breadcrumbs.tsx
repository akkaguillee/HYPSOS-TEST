import { Link } from 'react-router';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol role="list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }} className="t-micro">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {item.to ? (
              <Link to={item.to} className="breadcrumb-link" viewTransition>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" style={{ color: 'var(--fg)' }}>
                {item.label}
              </span>
            )}
            {index < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
