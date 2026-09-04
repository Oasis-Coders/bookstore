'use client';
import { useEffect } from 'react';

/**
 * Warn about unsaved form input when leaving the page.
 * Covers both full page unload (reload/close/tab) via beforeunload
 * and Next.js client-side navigation (nav links, sidebar) by
 * intercepting anchor clicks in the capture phase.
 */
export function useUnsavedGuard(dirty: boolean, isZh: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const msg = isZh
      ? '表单尚未保存，确定要离开吗？'
      : 'You have unsaved changes. Leave anyway?';

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = msg;
    };

    const onClickCapture = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.getAttribute('target') === '_blank') return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname + window.location.search + window.location.hash;
      const there = url.pathname + url.search + url.hash;
      if (there === here) return;
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(msg)) {
        window.location.href = url.toString();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [dirty, isZh]);
}
