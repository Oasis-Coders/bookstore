import Link from 'next/link';
import { cookies } from 'next/headers';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { isTicketAdmin } from './tickets/actions';

/** 常用工具：一页式小工具的入口（备用条码、批量导入、价格标签打印） */
export default async function ToolsPage() {
  const cookieStore = await cookies();
  const isZh = cookieStore.get('lang')?.value !== 'en';
  // 服务端门控：问题申报卡片 staff 在 HTML 里根本看不到
  const showTickets = await isTicketAdmin();

  const tools = [
    {
      href: '/tools/barcodes',
      titleZh: '备用条码库',
      titleEn: 'Spare Barcodes',
      descZh: '给无厂家条码的图书分配内部备用条码（EAN-13），支持多选打印、LL21 标签纸版式。',
      descEn: 'Assign internal EAN-13 spare barcodes, with multi-select and LL21 label printing.',
      icon: '▦',
      adminOnly: false,
    },
    {
      href: '/tools/import',
      titleZh: '批量导入',
      titleEn: 'Bulk Import',
      descZh: '用 CSV 模板批量导入图书，自动同步分类与出版社。',
      descEn: 'Bulk-import books from a CSV template; auto-syncs categories and publishers.',
      icon: '⇪',
      adminOnly: false,
    },
    {
      href: '/tools/price-tags',
      titleZh: '价格标签打印',
      titleEn: 'Price Tags',
      descZh: 'LL21 标签纸打印价格标签，每张手动填写书代码 + 售价。',
      descEn: 'Print price tags on LL21 label sheets; enter book code + price per tag.',
      icon: '🏷',
      adminOnly: false,
    },
    {
      href: '/tools/tickets',
      titleZh: '问题申报',
      titleEn: 'Tickets',
      descZh: '缺陷和需求提报，提交后助手自动跟进处理。',
      descEn: 'File bugs and feature requests; the assistant picks them up automatically.',
      icon: '🎫',
      adminOnly: true,
    },
  ];

  const renderCard = (t: (typeof tools)[number]) => (
    <Link key={t.href} href={t.href}>
      <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(45,47,146,0.15)]">
        <span className="text-[28px]">{t.icon}</span>
        <p className="mt-3 text-[15px] font-semibold text-cocm-ink">{isZh ? t.titleZh : t.titleEn}</p>
        <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-[#5b5f94]">
          {isZh ? t.descZh : t.descEn}
        </p>
        <span className="mt-3 text-[12px] font-medium text-cocm-red">
          {isZh ? '进入 →' : 'Open →'}
        </span>
      </Card>
    </Link>
  );

  return (
    <AppShell
      title="Tools"
      titleZh="常用工具"
      eyebrow={isZh ? '一次性小工具' : 'One-off utilities'}
    >
      <div className="mx-auto grid max-w-[900px] gap-4 sm:grid-cols-3">
        {tools.filter((t) => !t.adminOnly || showTickets).map(renderCard)}
      </div>
    </AppShell>
  );
}
