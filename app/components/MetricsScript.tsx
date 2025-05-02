'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

interface NavigatorConnection extends Navigator {
  connection?: {
    effectiveType: string;
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
  ttfb_error?: string;
  lcp_error?: string;
  fcp_error?: string;
  cls_error?: string;
  fid_error?: string;
  inp_error?: string;
  [key: string]: string | number | boolean | DeviceInfo | undefined;
}

export default function MetricsScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add click event listeners to force full page reloads
    const setupLinkHandlers = () => {
      document.querySelectorAll('a').forEach(link => {
        if (link.hostname === window.location.hostname) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = link.href;
          });
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLinkHandlers);
    } else {
      setupLinkHandlers();
    }

    // Function to collect device information
    const getDeviceInfo = (): DeviceInfo => {
      const navigatorWithConnection = navigator as NavigatorConnection;
      return {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        connectionType: navigatorWithConnection.connection?.effectiveType || 'unknown',
        language: navigator.language,
      };
    };

    // Create an object to collect all metrics
    const metrics: MetricsData = {
      pageURL: window.location.href,
      pathname: window.location.pathname,
      pageType: window.location.pathname.includes('/csr') ? 'CSR' : 'SSR',
      deviceInfo: getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };

    // Track if metrics have been sent already
    let metricsSent: boolean = false;

    // Function to get the API base URL dynamically
    const getApiBaseUrl = (): string => {
      return process.env.NODE_ENV === 'development'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
    };

    // Function to send metrics to the API with retry logic and sendBeacon fallback
    const sendMetrics = async (retryCount: number = 0, maxRetries: number = 2) => {
      if (metricsSent) return;

      // Check network availability
      if (!navigator.onLine) {
        console.warn('Device is offline, cannot send metrics');
        return;
      }

      // Ensure required metrics are available
      if (!(metrics.ttfb && (metrics.lcp || metrics.lcp_fallback))) {
        return;
      }

      metricsSent = true;
      const apiUrl = `${getApiBaseUrl()}/api/metrics`;
      const blob = new Blob([JSON.stringify(metrics)], { type: 'application/json' });

      console.log('Sending metrics to:', apiUrl);
      console.log('Metrics payload:', metrics);

      try {
        // Try fetch first
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(metrics),
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Metrics sent successfully:', data);
      } catch (error) {
        console.error('Fetch error:', error);

        // Fallback to sendBeacon
        try {
          const beaconSent = navigator.sendBeacon(apiUrl, blob);
          if (beaconSent) {
            console.log('Metrics sent successfully via sendBeacon');
          } else {
            throw new Error('sendBeacon failed');
          }
        } catch (beaconError) {
          console.error('sendBeacon error:', beaconError);

          // Retry logic
          if (retryCount < maxRetries) {
            console.log(`Retrying metrics send (attempt ${retryCount + 1}/${maxRetries})...`);
            metricsSent = false;
            setTimeout(() => sendMetrics(retryCount + 1, maxRetries), 1000 * (retryCount + 1));
          } else {
            console.error('Max retries reached, failed to send metrics');
            metrics.incomplete = true;
          }
        }
      }
    };

    // Set a fallback timer to ensure metrics are sent
    const timeoutId = setTimeout(() => {
      if (!metricsSent) {
        console.log('Sending metrics via timeout fallback');
        metrics.incomplete = true;
        sendMetrics();
      }
    }, 30000);

    // Function to safely collect metrics with browser compatibility handling
    const collectMetric = (
      metricName: string,
      metricFn: (onReport: (metric: { value: number }) => void) => void,
      onComplete?: () => void
    ) => {
      try {
        metricFn(({ value }) => {
          metrics[metricName] = value;
          console.log(`${metricName}:`, value);
          if (onComplete) onComplete();
        });
      } catch (error) {
        console.warn(`Failed to measure ${metricName}:`, error);
        metrics[`${metricName}_error`] = 'Not supported in this browser';
      }
    };

    // Handle each web-vital metric
    collectMetric('ttfb', onTTFB, () => sendMetrics());
    collectMetric('fcp', onFCP);
    collectMetric('lcp', onLCP, () => sendMetrics());
    collectMetric('cls', onCLS);
    collectMetric('fid', onFID);
    collectMetric('inp', onINP);

    // Fallback for browsers that don't support LCP
    if (
      !('PerformanceObserver' in window) ||
      !PerformanceObserver.supportedEntryTypes ||
      !PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')
    ) {
      console.log('LCP not supported, using load event as fallback');
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigationEntries = performance.getEntriesByType('navigation');
          if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
            metrics.lcp_fallback = navEntry.loadEventEnd;
            metrics.load = navEntry.loadEventEnd;
            console.log('Load event fallback:', navEntry.loadEventEnd);
            sendMetrics();
          }
        }, 1000);
      });
    }

    // Clean up on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
}