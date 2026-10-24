import type { CSSProperties, ElementType, ReactNode } from 'react';

interface RevealProps {
  as?: ElementType;
  /** Se mantiene por compatibilidad: ya no cambia nada (ver nota). */
  variant?: 'fade' | 'mask' | 'rise';
  index?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  id?: string;
}

/**
 * Contenedor de bloques de contenido. Antes los fundía y deslizaba al entrar en pantalla; el
 * sistema de movimiento actual reserva la animación para piezas con intención (titulares
 * prensados, aperturas de imagen y sellos), así que aquí el contenido está quieto.
 */
export function Reveal({ as: Tag = 'div', className, style, children, id }: RevealProps) {
  return (
    <Tag id={id} className={className} style={style}>
      {children}
    </Tag>
  );
}
