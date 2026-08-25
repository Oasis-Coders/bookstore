import { AppShell } from '@/components/layout/app-shell';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function Loading() {
  return (
    <AppShell title="Books" titleZh="书库" eyebrow="加载中…">
      <LoadingSkeleton variant="books" />
    </AppShell>
  );
}
