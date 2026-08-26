'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef<string>('');

  const clearTimers = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    // Don't flash for instant navigations - delay show by 80ms
    showTimerRef.current = setTimeout(() => {
      setVisible(true);
      setProgress(15);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 88) return p;
          // Slow down as it approaches 90%
          const inc = p < 40 ? 12 : p < 70 ? 6 : 2;
          return Math.min(88, p + inc + Math.random() * 3);
        });
      }, 180);
    }, 80);
  }, [clearTimers]);

  const complete = useCallback(() => {
    clearTimers();
    // If never became visible (fast nav), don't show at all
    if (!visible && !showTimerRef.current) {
      setProgress(0);
      return;
    }
    // Cancel pending show
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }, [clearTimers, visible]);

  // Complete when route (pathname + search) actually changes
  useEffect(() => {
    const current = `${pathname}?${searchParams.toString()}`;
    if (prevUrlRef.current && prevUrlRef.current !== current) {
      complete();
    }
    prevUrlRef.current = current;
  }, [pathname, searchParams, complete]);

  // Start on internal link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      // Ignore same URL
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname && url.search === `?${searchParams.toString()}`) return;
      start();
    };
    const handleSubmit = () => start();

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    // Also handle browser back/forward which doesn't trigger click
    window.addEventListener('popstate', start);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleSubmit);
      window.removeEventListener('popstate', start);
    };
  }, [pathname, searchParams, start]);

  // Safety: auto-complete after 4s max to avoid stuck bar
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => complete(), 4000);
    return () => clearTimeout(t);
  }, [visible, complete]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-[#d26a39] transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
