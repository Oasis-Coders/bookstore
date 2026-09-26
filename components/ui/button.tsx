import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const variantStyles = {
  primary: 'bg-cocm-red text-white hover:bg-[#c23340] shadow-[0_2px_8px_rgba(229,68,76,0.25)] focus:ring-cocm-red/35',
  secondary: 'bg-cocm-ink text-white hover:bg-[#3f43a8] focus:ring-cocm-ink/30',
  ghost: 'bg-transparent border border-cocm-ink/20 text-cocm-ink hover:bg-cocm-ink/6 hover:border-cocm-ink/40',
  danger: 'bg-[#c13515] text-white hover:bg-[#a52d12]',
};

const sizeStyles = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-6 text-[14px]',
  lg: 'h-12 px-8 text-[15px]',
};

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[12px] font-semibold tracking-[0.01em] transition-[color,background-color,border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
