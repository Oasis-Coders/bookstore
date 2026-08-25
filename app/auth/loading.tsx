export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf6ee]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-[10px] bg-[#0f3d2e]/20" />
        <p className="mt-3 text-[12px] text-[#4f7a5c]">加载中…</p>
      </div>
    </div>
  );
}
