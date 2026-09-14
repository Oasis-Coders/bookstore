import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'group/card rounded-[20px] border border-cocm-ink/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(45,47,146,0.04),0_4px_12px_rgba(45,47,146,0.04),0_16px_48px_rgba(45,47,146,0.06)] transition-[box-shadow,border-color,transform] hover:shadow-[0_2px_8px_rgba(45,47,146,0.06),0_8px_24px_rgba(45,47,146,0.08),0_24px_64px_rgba(45,47,146,0.10)] hover:border-cocm-ink/[0.10] lg:p-6',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-5 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-serif text-[18px] font-semibold tracking-tight text-cocm-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[12.5px] leading-relaxed text-[#5b5f94]', className)} {...props} />;
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-cocm-ink/10 bg-white p-6 shadow-[0_20px_80px_rgba(45,47,146,0.12),0_2px_8px_rgba(45,47,146,0.06)] lg:p-8',
        className
      )}
      {...props}
    />
  );
}

export function StatCard({ 
  label, 
  value, 
  hint, 
  accent,
  children,
  className 
}: { 
  label: string; 
  value: React.ReactNode; 
  hint?: string; 
  accent?: 'default' | 'amber' | 'success';
  children?: React.ReactNode;
  className?: string;
}) {
  const accentStyles = {
    default: 'from-cocm-ink/[0.02] to-transparent',
    amber: 'from-cocm-red/[0.08] to-transparent border-cocm-red/20',
    success: 'from-[#3f43a8]/[0.06] to-transparent'
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-[20px] border bg-white p-6 shadow-[0_1px_2px_rgba(45,47,146,0.04),0_4px_12px_rgba(45,47,146,0.04)]',
      accent ? accentStyles[accent] : 'border-cocm-ink/[0.06]',
      'bg-gradient-to-br',
      className
    )}>
      {accent && <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[20px] opacity-30" style={{ background: accent === 'amber' ? '#e5444c' : accent === 'success' ? '#3f43a8' : '#2d2f92' }} />}
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#5b5f94]/80">{label}</p>
        <div className="mt-3 font-serif text-[32px] font-semibold tracking-tight text-cocm-ink leading-none">{value}</div>
        {hint && <p className="mt-2.5 text-[12px] leading-relaxed text-[#5b5f94]">{hint}</p>}
        {children}
      </div>
    </div>
  );
}
