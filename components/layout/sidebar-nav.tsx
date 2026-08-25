'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems as defaultNav } from '@/lib/app-config';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

export function SidebarNav({ items = defaultNav }: { items?: typeof defaultNav }) {
  const pathname = usePathname();
  const { lang } = useT();
  const isZh = lang === 'zh';

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const label = isZh ? item.labelZh : item.label;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[13.5px] font-medium transition-all duration-200',
              isActive
                ? 'bg-white text-[#0f3d2e] shadow-[0_2px_12px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
            )}
          >
            <span className={cn(
              'h-[6px] w-[6px] rounded-full transition-all duration-200',
              isActive ? 'bg-[#d26a39] shadow-[0_0_8px_rgba(210,106,57,0.5)]' : 'bg-white/30 group-hover:bg-white/60 group-hover:scale-110'
            )} />
            <span className="flex-1 tracking-[-0.01em]">{label}</span>
            {isActive && <span className="h-1 w-1 rounded-full bg-[#d26a39] animate-pulse" />}
          </Link>
        );
      })}

      <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="rounded-[14px] bg-white/[0.06] backdrop-blur-sm px-3.5 py-3 border border-white/[0.08]">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50 mb-2.5 flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-[#d26a39]/60" />
          {isZh ? '快捷' : 'Quick'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/books/new" className="inline-flex items-center gap-1 rounded-[9px] bg-white/10 hover:bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:scale-[1.02] border border-white/10">
            <span className="text-[10px]">+</span> {isZh ? '书' : 'Book'}
          </Link>
          <Link href="/purchase-orders/new" className="inline-flex items-center gap-1 rounded-[9px] bg-[#d26a39] hover:bg-[#c85e2f] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:scale-[1.02] shadow-[0_2px_8px_rgba(210,106,57,0.3)]">
            {isZh ? '采购单' : 'Order'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
