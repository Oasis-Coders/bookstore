export function BookshopLoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-20">
      <div className="flex flex-col items-center">
        <div className="loading-logo-entrance mb-6">
          <svg width="56" height="56" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
            <circle cx="50" cy="18" r="7" className="loading-sun" fill="#d26a39" opacity="0.9" />
            <path d="M12 24 Q12 22 14 22 L36 22 L36 56 L14 56 Q12 56 12 54 Z" fill="#4f7a5c" opacity="0.6" />
            <path d="M36 22 L58 22 Q60 22 60 24 L60 54 Q60 56 58 56 L36 56 Z" fill="#0f3d2e" opacity="0.9" />
            <path d="M36 22 L36 56" stroke="#faf6ee" strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-[#4f7a5c]/70">正在准备…</p>
        <div className="mt-4 flex items-center gap-1.5">
          <span className="loading-dot loading-dot-1" />
          <span className="loading-dot loading-dot-2" />
          <span className="loading-dot loading-dot-3" />
        </div>
      </div>
    </div>
  );
}

export function BookshopLoadingScreenPanel() {
  return <BookshopLoadingScreen />;
}
