import { useId, useState, type ReactNode } from 'react';
import styles from './Accordion.module.css';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Ids abiertos al inicio. */
  defaultOpen?: string[];
  headingLevel?: 'h2' | 'h3';
}

export function Accordion({ items, defaultOpen = [], headingLevel: Heading = 'h3' }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const baseId = useId();
  const toggle = (id: string) => setOpen((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id} className={styles.item}>
            <Heading style={{ margin: 0 }}>
              <button
                type="button"
                id={triggerId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <span className={styles.icon} aria-hidden="true" />
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={triggerId} className={styles.panel} data-open={isOpen} inert={!isOpen}>
              <div className={styles.panelInner}>
                <div className={styles.content}>{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
