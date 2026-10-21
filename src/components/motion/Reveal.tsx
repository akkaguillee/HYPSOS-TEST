import { cn } from '@/lib/cn';
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

/**
 * Revela el contenido al entrar en pantalla (CSS + un único IntersectionObserver compartido).
 * Más ligero que un ScrollTrigger por elemento; respeta prefers-reduced-motion vía CSS.
 */

type Callback = () => void;
const callbacks = new WeakMap<Element, Callback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  return observer;
}

interface RevealProps {
  as?: ElementType;
  variant?: 'fade' | 'mask';
  /** Posición en una secuencia escalonada. */
  index?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  id?: string;
}

export function Reveal({ as: Tag = 'div', variant = 'fade', index = 0, className, style, children, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const io = getObserver();
    if (!element || !io) {
      setVisible(true);
      return;
    }
    callbacks.set(element, () => setVisible(true));
    io.observe(element);
    return () => {
      callbacks.delete(element);
      io.unobserve(element);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={cn(variant === 'mask' ? 'reveal--mask' : 'reveal', visible && 'is-visible', className)}
      style={{ ...style, '--reveal-index': Math.min(index, 8) } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
