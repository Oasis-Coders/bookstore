import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const variantStyles = {
  primary: 'bg-[#d26a39] text-white hover:bg-[#b8532b] shadow-[0_2px_8px_rgba(210,106,57,0.25)] focus:ring-[#d26a39]/35',
  secondary: 'bg-[#0f3d2e] text-white hover:bg-[#1a5c43] focus:ring-[#0f3d2e]/30',
  ghost: 'bg-transparent border border-[#0f3d2e]/20 text-[#0f3d2e] hover:bg-[#0f3d2e]/6 hover:border-[#0f3d2e]/40',
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
        'inline-flex items-center justify-center rounded-[12px] font-semibold tracking-[0.01em] transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
