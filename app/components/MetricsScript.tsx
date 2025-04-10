'use client';

import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';

const safeUUID = () => {
  return uuidv4();  // Generates a UUID
};

interface MetricsScriptProps {
  pageType: 'SSR' | 'CSR';
}

interface CustomNavigator extends Navigator {
  connection?: {
    effectiveType?: string;
  };
  deviceMemory?: number;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  interactionId: number;
  duration: number;
  name: string;
}

export default function MetricsScript({ pageType }: MetricsScriptProps) {
  useEffect(() => {
    const collectPerformanceMetrics = async () => {
      const nav = navigator as CustomNavigator;

      const metrics = {
        id: safeUUID(),
        timeStamp: Date.now(),
        pageType,
        ttfb: null as number | null,
        lcp: null as number | null,
        inp: null as number | null,
        userAgent: nav.userAgent,
        connectionType: nav.connection?.effectiveType ?? null,
        deviceMemory: nav.deviceMemory ?? null,
      };

      // TTFB
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming;
        metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      }

      // LCP Promise
      const lcpPromise = new Promise<number | null>((resolve) => {
        let lcpValue: number | null = null;

        try {
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              lcpValue = lastEntry.startTime;
            }
          });

          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

          setTimeout(() => {
            lcpObserver.disconnect();
            resolve(lcpValue);
          }, 3000);
        } catch (e) {
          console.error('LCP observe error:', e);
          resolve(null);
        }
      });

      // INP Promise
      const inpPromise = new Promise<number | null>((resolve) => {
        let inpValue: number | null = null;

        try {
          const inpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();

            entries.forEach((entry) => {
              const eventEntry = entry as PerformanceEventTiming;

              if (
                typeof eventEntry.interactionId === 'number' &&
                (inpValue === null || eventEntry.duration > inpValue)
              ) {
                inpValue = eventEntry.duration;
              }
            });
          });

          inpObserver.observe({ type: 'event', buffered: true });

          setTimeout(() => {
            inpObserver.disconnect();
            resolve(inpValue);
          }, 3000);
        } catch (e) {
          console.error('INP observer error:', e);
          resolve(null);
        }
      });

      metrics.lcp = await lcpPromise;
      metrics.inp = await inpPromise;

      try {
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metrics),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        console.log(`${pageType} metrics collected and saved:`, metrics);
      } catch (error) {
        console.error('Error saving metrics:', error);
      }
    };

    const timer = setTimeout(() => collectPerformanceMetrics(), 100);

    return () => clearTimeout(timer);
  }, [pageType]);

  return null;
}
