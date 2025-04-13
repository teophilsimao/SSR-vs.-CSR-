'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Extend navigator types safely
interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

const MetricsScript = () => {
  const pathname = usePathname();
  const router = useRouter();

  const getPageType = (path: string) => {
    if (path.includes('/ssr')) return 'SSR';
    if (path.includes('/csr')) return 'CSR';
    return 'Other';
  };

  const pageType = getPageType(pathname);

  const handleNavigation = (href: string) => {
    const currentType = getPageType(pathname);
    const targetType = getPageType(href);

    if (
      currentType !== targetType &&
      currentType !== 'Other' &&
      targetType !== 'Other'
    ) {
      window.location.href = href;
    } else {
      router.push(href);
    }
  };

  useEffect(() => {
    if (pageType === 'Other' || typeof window === 'undefined') return;

    window.__PERFORMANCE_METRICS__ = {
      lastNavigationTime: Date.now(),
      lastPathname: pathname,
      inpEntries: [],
    };

    const collectAndSendMetrics = async () => {
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => setTimeout(collectAndSendMetrics, 100));
        return;
      }

      setTimeout(async () => {
        const navigationEntries = performance.getEntriesByType('navigation');
        const navigation = navigationEntries.length > 0
          ? navigationEntries[0] as PerformanceNavigationTiming
          : null;

        const paintMetrics = performance.getEntriesByType('paint');
        const firstPaint = paintMetrics.find(entry => entry.name === 'first-paint')?.startTime ?? null;
        const firstContentfulPaint = paintMetrics.find(entry => entry.name === 'first-contentful-paint')?.startTime ?? null;

        const metricsStore = window.__PERFORMANCE_METRICS__ || {};
        const ttfb = navigation ? navigation.responseStart - navigation.requestStart : null;

        let interactionToNextPaint: number | null = null;
        if (metricsStore.inpEntries && metricsStore.inpEntries.length > 0) {
          const sortedEntries = [...metricsStore.inpEntries].sort((a, b) => a - b);
          const idx = Math.floor(sortedEntries.length * 0.75);
          interactionToNextPaint = sortedEntries[idx];
        } else {
          interactionToNextPaint = metricsStore.inp ?? null;
        }

        const nav = navigator as NavigatorExtended;

        const metrics = {
          pageURL: window.location.href,
          pathname,
          pageType,
          timestamp: new Date().toISOString(),
          ttfb,
          domLoad: navigation ? navigation.domContentLoadedEventEnd : null,
          windowLoad: navigation ? navigation.loadEventEnd : null,
          firstPaint,
          firstContentfulPaint,
          largestContentfulPaint: metricsStore.lcp ?? null,
          interactionToNextPaint,
          firstInputDelay: metricsStore.fid ?? null,
          navigationType: navigation ? navigation.type : 'unknown',
          deviceInfo: {
            userAgent: nav.userAgent,
            deviceMemory: nav.deviceMemory,
            connection: nav.connection
              ? {
                  type: nav.connection.effectiveType,
                  downlink: nav.connection.downlink,
                  rtt: nav.connection.rtt,
                }
              : undefined,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          },
        };

        try {
          const response = await fetch('/api/metrics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metrics),
          });

          if (!response.ok) {
            throw new Error(`Failed to send metrics: ${response.status}`);
          }

          console.log('Performance metrics sent successfully for', pageType);
        } catch (error) {
          console.error('Error sending performance metrics:', error);
        }
      }, 3000);
    };

    setupPerformanceObservers();
    collectAndSendMetrics();

    const clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href')) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          e.preventDefault();
          handleNavigation(href);
        }
      }
    };

    document.addEventListener('click', clickListener);

    return () => {
      document.removeEventListener('click', clickListener);
    };
  }, [pathname, pageType, router]);

  const setupPerformanceObservers = () => {
    if (!('PerformanceObserver' in window)) return;

    if (!window.__PERFORMANCE_METRICS__) {
      window.__PERFORMANCE_METRICS__ = {
        inpEntries: [],
      };
    }

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          window.__PERFORMANCE_METRICS__!.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observation not supported', e);
    }

    try {
      const interactionObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          const duration = (entry as PerformanceEventTiming).duration;
          if (window.__PERFORMANCE_METRICS__) {
            window.__PERFORMANCE_METRICS__.inpEntries!.push(duration);
            window.__PERFORMANCE_METRICS__.inp = duration;
          }
        });
      });

      interactionObserver.observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
    } catch (e) {
      console.warn('Interaction observation not supported', e);
    }

    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const entry = entries[0] as PerformanceEventTiming;
          const delay = entry.processingStart - entry.startTime;
          if (window.__PERFORMANCE_METRICS__) {
            window.__PERFORMANCE_METRICS__.fid = delay;
          }
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observation not supported', e);
    }
  };

  return <div style={{ display: 'none' }} />;
};

// Export a custom link component that forces full page loads between SSR/CSR
export const MetricsLink = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
  const pathname = usePathname();

  const getPageType = (path: string) => {
    if (path.includes('/ssr')) return 'SSR';
    if (path.includes('/csr')) return 'CSR';
    return 'Other';
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const currentType = getPageType(pathname);
    const targetType = getPageType(href);

    if (
      currentType !== targetType &&
      currentType !== 'Other' &&
      targetType !== 'Other'
    ) {
      return;
    } else {
      e.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

declare global {
  interface Window {
    __PERFORMANCE_METRICS__?: {
      lcp?: number;
      inp?: number;
      fid?: number;
      lastNavigationTime?: number;
      lastPathname?: string;
      inpEntries?: number[];
    };
  }
}

export default MetricsScript;
