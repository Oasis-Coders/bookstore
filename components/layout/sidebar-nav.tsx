'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/app-config';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

const icons: Record<string, string> = {
  '/': '◐',
  '/books': '📚',
  '/suppliers': '🏭',
  '/locations': '📍',
  '/purchase-orders': '📋',
  '/sales': '💳',
  '/reports': '📊',
};

export function SidebarNav({ items = navItems }: { items?: typeof navItems }) {
  const pathname = usePathname();
  const { lang } = useT();
  const isZh = lang === 'zh';

  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const label = isZh ? item.labelZh : item.label;
        const icon = icons[item.href] || '•';

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[13.5px] font-medium transition-all',
              isActive
                ? 'bg-white text-[#0f3d2e] shadow-[0_2px_12px_rgba(0,0,0,0.12)]'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            )}
          >
            <span className={cn('text-[15px] leading-none transition-transform group-hover:scale-110', isActive && 'text-[#0f3d2e]')}>{icon}</span>
            <span className="flex-1">{label}</span>
            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#d26a39]" />}
          </Link>
        );
      })}

      <div className="my-3 h-px bg-white/10" />

      <div className="rounded-[12px] bg-white/8 px-3.5 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{isZh ? '快速' : 'Quick'}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href="/books/new" className="inline-flex rounded-[8px] bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/25">
            {isZh ? '+ 书' : '+ Book'}
          </Link>
          <Link href="/purchase-orders" className="inline-flex rounded-[8px] bg-[#d26a39]/90 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#d26a39]">
            {isZh ? '采购' : 'PO'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
