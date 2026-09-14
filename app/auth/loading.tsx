export default function Loading() {
  return (
    <div className="brand-wash-bg flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-[10px] bg-[#2d2f92]/20" />
        <p className="mt-3 text-[12px] text-[#5b5f94]">加载中…</p>
      </div>
    </div>
  );
}
