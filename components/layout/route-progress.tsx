'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(true);
    setProgress(30);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + (90 - p) * 0.1;
      });
    }, 300);
  }, []);

  const complete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      complete();
      prevPathRef.current = pathname;
    }
  }, [pathname, complete]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
      if (href === pathname) return;
      start();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname, start]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] h-[3px]">
      <div className="h-full bg-[#d26a39] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
    </div>
  );
}
