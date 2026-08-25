export function BookshopLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#faf6ee]">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="loading-orb loading-orb-1" />
        <div className="loading-orb loading-orb-2" />
        <div className="loading-orb loading-orb-3" />
        <div className="loading-orb loading-orb-4" />
      </div>

      {/* Wave layers at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0" aria-hidden="true">
        <svg className="loading-wave w-full" viewBox="0 0 1440 220" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path className="loading-wave-path-1" d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 L1440,220 L0,220 Z" fill="rgba(15,61,46,0.06)" />
          <path className="loading-wave-path-2" d="M0,140 C240,80 480,200 720,140 C960,80 1200,200 1440,140 L1440,220 L0,220 Z" fill="rgba(15,61,46,0.04)" />
          <path className="loading-wave-path-3" d="M0,160 C360,200 720,120 1080,160 C1260,180 1380,150 1440,160 L1440,220 L0,220 Z" fill="rgba(79,122,92,0.05)" />
        </svg>
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo - book + COCM style */}
        <div className="loading-logo-entrance mb-6">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
            <circle cx="50" cy="18" r="7" className="loading-sun" fill="#d26a39" opacity="0.9" />
            {/* Book shape */}
            <path d="M12 24 Q12 22 14 22 L36 22 L36 56 L14 56 Q12 56 12 54 Z" fill="#4f7a5c" opacity="0.6" />
            <path d="M36 22 L58 22 Q60 22 60 24 L60 54 Q60 56 58 56 L36 56 Z" fill="#0f3d2e" opacity="0.9" />
            <path d="M36 22 L36 56" stroke="#faf6ee" strokeWidth="1.5" opacity="0.5" />
            <path d="M16 30 L32 30" stroke="#faf6ee" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <path d="M16 36 L32 36" stroke="#faf6ee" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <path d="M16 42 L28 42" stroke="#faf6ee" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="loading-title-entrance font-serif text-3xl tracking-tight text-[#0f3d2e] sm:text-4xl">
          活水书房
        </h1>
        <p className="loading-subtitle-entrance mt-1 font-serif text-[14px] text-[#0f3d2e]/60">
          COCM Bookshop
        </p>
        <p className="loading-subtitle-entrance mt-2 text-sm font-medium text-[#4f7a5c]/70">
          正在准备你的书店…
        </p>

        {/* Flowing dots */}
        <div className="mt-8 flex items-center gap-2">
          <span className="loading-dot loading-dot-1" />
          <span className="loading-dot loading-dot-2" />
          <span className="loading-dot loading-dot-3" />
        </div>
      </div>
    </div>
  );
}
