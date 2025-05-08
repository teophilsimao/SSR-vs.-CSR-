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

    const sendMetrics = async (forceIncomplete = false) => {
      if (metricsSent || !navigator.onLine) return;

      // Check if we have essential metrics or if we're forcing incomplete data
      if (!metrics.ttfb || !metrics.lcp) {
        if (!forceIncomplete) return;
        metrics.incomplete = true;
      }

      metricsSent = true;
      const apiUrl = `${getApiBaseUrl()}/api/metrics`;

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log('Metrics sent:', await res.json());
      } catch (err) {
        console.error('Failed to send metrics', err);
      }
    };

    onTTFB(({ value }) => {
      metrics.ttfb = value;
    });

    onFCP(({ value }) => {
      metrics.fcp = value;
    });

    onLCP(({ value }) => {
      metrics.lcp = value;
    });

    onCLS(({ value }) => {
      metrics.cls = value;
    });

    onFID(({ value }) => {
      metrics.fid = value;
    });

    // Key change: create an explicit callback for INP
    let inpReported = false;
    onINP(({ value }) => {
      metrics.inp = value;
      inpReported = true;
      console.log('INP reported:', value);
      
      // Try to send metrics when INP becomes available 
      // (if interaction has already happened)
      if (interactionOccurred) {
        setTimeout(() => sendMetrics(), 1000);
      }
    });

    let interactionOccurred = false;
    // Listen for any click in the document, not just once
    const clickHandler = () => {
      interactionOccurred = true;
      console.log('Interaction detected, waiting for INP calculation...');
      
      // First attempt after a reasonable delay
      setTimeout(() => {
        if (inpReported) {
          console.log('INP available after interaction:', metrics.inp);
          sendMetrics();
        } else {
          console.log('INP not yet available, waiting longer...');
          
          // Second attempt with longer delay
          setTimeout(() => {
            if (inpReported) {
              console.log('INP now available:', metrics.inp);
              sendMetrics();
            } else {
              console.log('INP still not available, sending incomplete metrics');
              // Force send even if INP isn't available
              sendMetrics(true);
            }
          }, 5000); // Wait 5 more seconds
        }
      }, 5000); // Initial 5 second wait after interaction
    };

    document.addEventListener('click', clickHandler);
    
    // Fallback to ensure metrics get sent even if there's no interaction
    const fallbackTimeout = setTimeout(() => {
      if (!metricsSent) {
        console.log('Fallback: No interaction detected, sending available metrics');
        sendMetrics(true);
      }
    }, 30000); // 30 seconds fallback

    return () => {
      document.removeEventListener('click', clickHandler);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return null;
}