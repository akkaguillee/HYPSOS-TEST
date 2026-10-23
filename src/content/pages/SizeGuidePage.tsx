import { SizeGuideTable } from '@/components/commerce/SizeGuide';
import { sizeGuides } from '@/content/size-guide';
import { paths } from '@shared/routes';
import styles from './Content.module.css';
import { ContentLayout, PageToc } from './ContentLayout';
import { PageIntro } from './PageIntro';

export function SizeGuidePage() {
  return (
    <>
      <PageIntro
        title="Guía de tallas"
        lead="Medidas de la prenda en plano, en centímetros. Compáralas con una prenda tuya que te quede bien."
        breadcrumbs={[{ label: 'Inicio', to: paths.home }, { label: 'Guía de tallas' }]}
      />
      <ContentLayout
        rail={
          <PageToc
            items={[
              { id: 'tallas-tops', label: sizeGuides.tops.title },
              { id: 'tallas-bottoms', label: sizeGuides.bottoms.title },
            ]}
          />
        }
      >
        <div className={styles.sizeTables}>
          <section id="tallas-tops" aria-label={sizeGuides.tops.title}>
            <SizeGuideTable type="tops" />
          </section>
          <section id="tallas-bottoms" aria-label={sizeGuides.bottoms.title}>
            <SizeGuideTable type="bottoms" />
          </section>
          <p className={styles.sizeNote}>Medidas provisionales: pueden variar ±1,5 cm según la prenda.</p>
        </div>
      </ContentLayout>
    </>
  );
}
