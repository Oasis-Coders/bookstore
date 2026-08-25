import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems } from '@/lib/app-config';

type AppShellProps = {
  title: string;
  titleZh: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppShell({ title, titleZh, eyebrow, children, actions }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#0f3d2e]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-8">
        <MobileSidebar>
          <div className="rounded-[28px] bg-[#0f3d2e] p-6 text-white shadow-[0_18px_60px_rgba(15,61,46,0.14)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d9edf6]">
              Living Water
            </p>
            <h1 className="mt-2 font-serif text-[24px] leading-tight tracking-tight">
              活水书室
              <br />
              <span className="text-[15px] font-sans font-normal opacity-80">Bookstore System</span>
            </h1>
            <div className="mt-4 flex gap-2">
              <span className="inline-flex rounded-[10px] bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide">
                COCM 设计
              </span>
              <span className="inline-flex rounded-[10px] bg-[#d26a39] px-3 py-1 text-[11px] font-semibold text-white">
                生产版
              </span>
            </div>
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <SidebarNav items={navItems} />
            <div className="mt-auto border-t border-white/10 pt-4">
              <p className="px-4 text-[11px] text-white/40">
                复用 COCM Camp App 设计系统
                <br />
                cream / forest / ember
              </p>
            </div>
          </div>
        </MobileSidebar>

        <main className="flex-1 pt-14 lg:pt-0">
          <header className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[rgba(15,61,46,0.03)_0px_0px_0px_1px,rgba(15,61,46,0.05)_0px_2px_8px,rgba(15,61,46,0.10)_0px_8px_24px] lg:p-8">
            <div>
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#4f7a5c]">
                  {eyebrow}
                </p>
              )}
              <h2 className="mt-2 font-serif text-[32px] tracking-tight text-[#0f3d2e] lg:text-[40px]">
                {titleZh}
                <span className="ml-3 font-sans text-[14px] font-medium text-[#4f7a5c]">{title}</span>
              </h2>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </header>

          <section className="mt-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
