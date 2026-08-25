import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[rgba(15,61,46,0.03)_0px_0px_0px_1px,rgba(15,61,46,0.05)_0px_2px_8px,rgba(15,61,46,0.10)_0px_8px_24px] lg:p-6',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-serif text-[20px] tracking-tight text-[#0f3d2e]', className)} {...props} />;
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[0_18px_60px_rgba(15,61,46,0.14)] lg:p-8',
        className
      )}
      {...props}
    />
  );
}
