import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-[20px] border border-[#0f3d2e]/15 bg-white px-4 py-2 text-[14px] text-[#0f3d2e] placeholder:text-[#0f3d2e]/40 focus:border-[#4f7a5c] focus:outline-none focus:ring-[3px] focus:ring-[#4f7a5c]/20',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

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
