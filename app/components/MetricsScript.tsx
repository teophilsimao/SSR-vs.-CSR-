'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

interface NavigatorConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  connectionType: string;
  language: string;
}

interface MetricsData {
  pageURL: string;
  pathname: string;
  pageType: string;
  deviceInfo: DeviceInfo;
  timestamp: string;
  ttfb?: number;
  lcp?: number;
  lcp_fallback?: number;
  fcp?: number;
  cls?: number;
  fid?: number;
  inp?: number;
  load?: number;
  incomplete?: boolean;
  [key: string]: string | number | boolean | DeviceInfo | undefined;
}

export default function MetricsScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getDeviceInfo = (): DeviceInfo => {
      const navigatorWithConnection = navigator as NavigatorConnection;
      const connection = navigatorWithConnection.connection;
      return {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        connectionType: typeof connection?.effectiveType === 'string' ? connection.effectiveType : 'unknown',
        language: navigator.language,
      };
    };

    const metrics: MetricsData = {
      pageURL: window.location.href,
      pathname: window.location.pathname,
      pageType: window.location.pathname.includes('/csr') ? 'CSR' : 'SSR',
      deviceInfo: getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };

    let metricsSent = false;

    const getApiBaseUrl = (): string => {
      return process.env.NODE_ENV === 'development'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
    };

    const sendMetrics = async (retryCount = 0, maxRetries = 2) => {
      if (metricsSent || !navigator.onLine) return;

      if (!(metrics.ttfb && (metrics.lcp || metrics.lcp_fallback))) return;

      metricsSent = true;
      const apiUrl = `${getApiBaseUrl()}/api/metrics`;
      const blob = new Blob([JSON.stringify(metrics)], { type: 'application/json' });

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log('✅ Metrics sent:', await res.json());
      } catch (err) {
        console.warn('❌ Fetch error, trying sendBeacon...');
        try {
          if (!navigator.sendBeacon(apiUrl, blob)) throw new Error('sendBeacon failed');
          console.log('✅ Metrics sent via sendBeacon');
        } catch {
          if (retryCount < maxRetries) {
            metricsSent = false;
            setTimeout(() => sendMetrics(retryCount + 1), 1000 * (retryCount + 1));
          } else {
            metrics.incomplete = true;
            console.error('❌ Failed after retries', err);
          }
        }
      }
    };

    const collectMetric = (
      key: keyof MetricsData,
      fn: (cb: (metric: { value: number }) => void) => void,
      onReady?: () => void
    ) => {
      try {
        fn(({ value }) => {
          metrics[key] = value;
          if (onReady) onReady();
        });
      } catch {
        metrics[`${key}_error`] = 'not supported';
      }
    };

    // Collect supported metrics
    if (performance.getEntriesByType('navigation').length > 0) {
      collectMetric('ttfb', onTTFB, sendMetrics);
    }

    collectMetric('fcp', onFCP);
    collectMetric('cls', onCLS);
    collectMetric('fid', onFID);
    collectMetric('inp', onINP);

    // Check for LCP support
    const supportsLCP = typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint');

    if (supportsLCP) {
      collectMetric('lcp', onLCP, sendMetrics);
    } else {
      // Fallback for LCP (Firefox/Safari)
      window.addEventListener('load', () => {
        setTimeout(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (nav) {
            metrics.lcp_fallback = nav.loadEventEnd;
            metrics.load = nav.loadEventEnd;
            sendMetrics();
          }
        }, 1000);
      });

      // Also fallback if LCP wasn't reported after 5s
      setTimeout(() => {
        if (!metrics.lcp && !metrics.lcp_fallback) {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (nav) {
            metrics.lcp_fallback = nav.loadEventEnd;
            sendMetrics();
          }
        }
      }, 5000);
    }

    // Fallback to ensure sending metrics even if nothing fires
    const timeoutId = setTimeout(() => {
      if (!metricsSent) {
        metrics.incomplete = true;
        sendMetrics();
      }
    }, 30000);

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
