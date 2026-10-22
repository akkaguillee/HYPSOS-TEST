import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import { LiquidGlass } from './LiquidGlass';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useScrollLock(open);
  useFocusTrap(dialogRef, open, onClose);

  return (
    <div className={styles.root} data-theme="dark" data-open={open} inert={!open}>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <LiquidGlass ref={dialogRef} radius={20} bezel={18} refraction={22} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={styles.dialog}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
        <div className={styles.body}>{children}</div>
      </LiquidGlass>
    </div>
  );
}
