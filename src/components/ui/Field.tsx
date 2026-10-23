import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, error, hint, optional, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}>(opcional)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

type BaseProps = { label: string; error?: string; hint?: string; optional?: boolean; className?: string };

export function TextField({ label, error, hint, optional, className, ...input }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={styles.control}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={!optional}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function TextArea({ label, error, hint, optional, className, ...input }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className={styles.control}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={!optional}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  className,
  options,
  placeholder,
  ...select
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={styles.selectWrap}>
          <select
            id={id}
            className={styles.control}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={!optional}
            {...select}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </FieldShell>
  );
}

export function Checkbox({
  children,
  error,
  className,
  ...input
}: { children: ReactNode; error?: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.checkbox} htmlFor={id}>
        <input id={id} type="checkbox" aria-invalid={Boolean(error) || undefined} aria-describedby={errorId} {...input} />
        <span>{children}</span>
      </label>
      {error && (
        <p id={errorId} className={styles.error}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({
  tone = 'error',
  title,
  children,
  className,
}: {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertCircle;
  return (
    <div
      className={cn(styles.alert, tone === 'error' && styles.alertError, tone === 'success' && styles.alertSuccess, tone === 'info' && styles.alertInfo, className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" />
      <div className={styles.alertBody}>
        {title && <p className={styles.alertTitle}>{title}</p>}
        {children}
      </div>
    </div>
  );
}
