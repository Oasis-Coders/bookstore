import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'active' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-[#f4e8c1] text-[#0f3d2e]',
    active: 'bg-[#d26a39] text-white',
    warning: 'bg-[#fef3c7] text-[#92400e]',
    danger: 'bg-[#f9e0d0] text-[#9c4221]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[10px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
