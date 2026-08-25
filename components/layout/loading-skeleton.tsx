type SkeletonVariant = 'default' | 'dashboard' | 'form' | 'table' | 'books';

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#0f3d2e]/10 ${className ?? ''}`} />;
}

function HeaderSkeleton() {
  return (
    <div className="rounded-[28px] border border-[#0f3d2e]/10 bg-white p-6 shadow-[rgba(15,61,46,0.03)_0px_0px_0px_1px,rgba(15,61,46,0.05)_0px_2px_8px,rgba(15,61,46,0.10)_0px_8px_24px] lg:p-8">
      <Pulse className="h-3 w-24" />
      <Pulse className="mt-4 h-9 w-64" />
    </div>
  );
}

function DefaultContent() {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
        <Pulse className="h-5 w-48" />
        <Pulse className="mt-4 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-3/4" />
        <Pulse className="mt-2 h-4 w-5/6" />
      </div>
      <div className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
        <Pulse className="h-5 w-36" />
        <Pulse className="mt-4 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-2/3" />
      </div>
    </div>
  );
}

function DashboardContent() {
  return (
    <>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
            <Pulse className="h-3 w-20" />
            <Pulse className="mt-3 h-8 w-16" />
            <Pulse className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm lg:col-span-2">
          <Pulse className="h-5 w-32" />
          <Pulse className="mt-4 h-32 w-full rounded-[12px]" />
        </div>
        <div className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
          <Pulse className="h-5 w-24" />
          <Pulse className="mt-4 h-4 w-full" />
          <Pulse className="mt-2 h-4 w-3/4" />
          <Pulse className="mt-2 h-4 w-5/6" />
          <Pulse className="mt-4 h-10 w-full rounded-[12px]" />
        </div>
      </div>
    </>
  );
}

function FormContent() {
  return (
    <div className="mt-6 rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={i > 1 ? 'mt-5' : ''}>
          <Pulse className="h-3 w-28" />
          <Pulse className="mt-2 h-10 w-full rounded-[12px]" />
        </div>
      ))}
      <Pulse className="mt-6 h-10 w-36 rounded-[12px]" />
    </div>
  );
}

function TableContent() {
  return (
    <div className="mt-6 rounded-[20px] border border-[#0f3d2e]/10 bg-white p-6 shadow-sm">
      <div className="flex gap-2">
        <Pulse className="h-9 w-64 rounded-[12px]" />
        <Pulse className="h-9 w-24 rounded-[12px]" />
      </div>
      <div className="mt-4 space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Pulse key={i} className="h-12 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

function BooksContent() {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Pulse className="h-10 w-72 rounded-[12px]" />
        <Pulse className="h-10 w-24 rounded-[12px]" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[20px] border border-[#0f3d2e]/10 bg-white p-5">
            <Pulse className="h-5 w-3/4" />
            <Pulse className="mt-2 h-3 w-1/2" />
            <Pulse className="mt-4 h-4 w-full" />
            <Pulse className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ variant = 'default' }: { variant?: SkeletonVariant }) {
  return (
    <div className="flex-1">
      <HeaderSkeleton />
      {variant === 'dashboard' && <DashboardContent />}
      {variant === 'form' && <FormContent />}
      {variant === 'table' && <TableContent />}
      {variant === 'books' && <BooksContent />}
      {variant === 'default' && <DefaultContent />}
    </div>
  );
}
