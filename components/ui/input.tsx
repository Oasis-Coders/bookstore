import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 py-2 text-[14px] text-[#0f3d2e] placeholder:text-[#0f3d2e]/40 focus:border-[#4f7a5c] focus:outline-none focus:ring-[3px] focus:ring-[#4f7a5c]/20',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 py-3 text-[14px] text-[#0f3d2e] placeholder:text-[#0f3d2e]/40 focus:border-[#4f7a5c] focus:outline-none focus:ring-[3px] focus:ring-[#4f7a5c]/20',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 py-2 text-[14px] text-[#0f3d2e] focus:border-[#4f7a5c] focus:outline-none focus:ring-[3px] focus:ring-[#4f7a5c]/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
