import { cn } from '@/lib/cn';
import { formatPrice } from '@shared/pricing';

interface PriceProps {
  amount: number;
  compareAt?: number;
  className?: string;
}

export function Price({ amount, compareAt, className }: PriceProps) {
  const onSale = compareAt !== undefined && compareAt > amount;
  return (
    <span className={cn('t-num', className)}>
      {onSale && (
        <>
          <span className="visually-hidden">Precio anterior:</span>
          <s style={{ color: 'var(--fg-muted)', marginRight: '0.5em', fontWeight: 400 }}>{formatPrice(compareAt)}</s>
          <span className="visually-hidden">Precio actual:</span>
        </>
      )}
      {formatPrice(amount)}
    </span>
  );
}
