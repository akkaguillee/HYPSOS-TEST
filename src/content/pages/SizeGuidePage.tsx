import { SizeGuideTable } from '@/components/commerce/SizeGuide';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@shared/routes';

export function SizeGuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Ayuda"
        title="Guía de tallas"
        description="Medidas de la prenda en plano, en centímetros. Compáralas con una prenda tuya que te quede bien."
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Guía de tallas' }]}
      />
      <div className="container" style={{ display: 'grid', gap: 'var(--space-8)', paddingBlock: 'var(--space-7) var(--section-y)', maxWidth: 'calc(880px + var(--gutter) * 2)' }}>
        <SizeGuideTable type="tops" />
        <SizeGuideTable type="bottoms" />
        <p className="t-small t-muted">Medidas provisionales: pueden variar ±1,5 cm según la prenda.</p>
      </div>
    </>
  );
}
