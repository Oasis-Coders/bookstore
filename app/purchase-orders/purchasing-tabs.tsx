'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/use-t';
import { cn } from '@/lib/utils';

export function PurchasingTabs({ active }: { active: 'orders' | 'reference' }) {
  const { tt } = useT();
  const tabs = [
    { key: 'orders', href: '/purchase-orders', label: tt('purchaseReference.tabOrders') },
    { key: 'reference', href: '/purchase-orders/reference', label: tt('purchaseReference.tabReference') },
  ] as const;
  return (
    <div className="mb-4 inline-flex rounded-full border border-[#e9e2d4] bg-white p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            'rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-all',
            active === t.key ? 'bg-cocm-ink text-white shadow' : 'text-[#5b5f94] hover:text-cocm-ink'
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
