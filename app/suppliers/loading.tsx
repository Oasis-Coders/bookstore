import { AppShell } from '@/components/layout/app-shell';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function Loading() {
  return (
    <AppShell title="suppliers" titleZh="加载中" eyebrow="活水书房">
      <LoadingSkeleton variant="table" />
    </AppShell>
  );
}
