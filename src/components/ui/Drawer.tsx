import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { useId, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { IconButton } from './Button';
import styles from './Drawer.module.css';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  side?: 'left' | 'right';
  width?: string;
  footer?: ReactNode;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  /** Contenido propio para la cabecera (sustituye al título visible). */
  headerContent?: ReactNode;
}

/** Panel lateral modal accesible: foco atrapado, Escape, bloqueo de scroll e `inert` al cerrarse. */
export function Drawer({ open, onClose, title, side = 'right', width, footer, children, initialFocusRef, className, headerContent }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useScrollLock(open);
  useFocusTrap(panelRef, open, onClose, initialFocusRef);

  return (
    <div className={styles.root} data-open={open} inert={!open} style={width ? ({ '--drawer-width': width } as CSSProperties) : undefined}>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(styles.panel, styles[side], className)}
      >
        <div className={styles.header}>
          {headerContent ?? (
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          )}
          {headerContent && (
            <h2 id={titleId} className="visually-hidden">
              {title}
            </h2>
          )}
          <IconButton label="Cerrar" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
