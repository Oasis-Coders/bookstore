'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/app-config';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';

export function SidebarNav({ items = navItems }: { items?: typeof navItems }) {
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
              'flex items-center justify-between rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all',
              isActive
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/8 hover:text-white'
            )}
          >
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
