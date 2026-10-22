import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'text';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

function buttonClass({ variant = 'primary', size = 'md', block }: StyleProps, extra?: string, loading?: boolean) {
  return cn(
    styles.button,
    styles[variant],
    size !== 'md' && styles[size],
    block && styles.block,
    loading && styles.loading,
    extra,
  );
}

interface ButtonProps extends StyleProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, size, block, loading, className, children, type = 'button', disabled, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block }, className, loading)}
      data-variant={variant ?? 'primary'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}

interface ButtonLinkProps extends StyleProps, LinkProps {
  children: ReactNode;
}

export function ButtonLink({ variant, size, block, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, className)} data-variant={variant ?? 'primary'} viewTransition {...rest}>
      <span className={styles.label}>{children}</span>
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  badge?: number;
  badgeKey?: string | number;
  ref?: Ref<HTMLButtonElement>;
}

/** Botón de icono con nombre accesible obligatorio y contador opcional. */
export function IconButton({ label, badge, badgeKey, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cn(styles.iconButton, className)} aria-label={label} title={label} {...rest}>
      {children}
      {badge !== undefined && badge > 0 && (
        <span key={badgeKey} className={cn(styles.badge, styles.badgePop)} aria-hidden="true">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

interface IconLinkProps extends LinkProps {
  label: string;
  badge?: number;
  badgeKey?: string | number;
}

/** Enlace con apariencia de botón de icono (p. ej. favoritos en la cabecera). */
export function IconLink({ label, badge, badgeKey, className, children, ...rest }: IconLinkProps) {
  return (
    <Link className={cn(styles.iconButton, className)} aria-label={label} title={label} viewTransition {...rest}>
      {children}
      {badge !== undefined && badge > 0 && (
        <span key={badgeKey} className={cn(styles.badge, styles.badgePop)} aria-hidden="true">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
