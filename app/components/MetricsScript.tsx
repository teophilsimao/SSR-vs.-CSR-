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

// Define a comprehensive interface for device info
interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  connectionType: string;
  language: string;
}

// Define a comprehensive interface for all metrics
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
  browserName?: string;
  browserVersion?: string;
  ttfb_error?: string;
  lcp_error?: string;
  fcp_error?: string;
  cls_error?: string;
  fid_error?: string;
  inp_error?: string;
  [key: string]: any; 
}

export default function MetricsScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Add click event listeners to force full page reloads
    const setupLinkHandlers = () => {
      // Find all links in the document
      document.querySelectorAll('a').forEach(link => {
        // Only apply to internal links (same domain)
        if (link.hostname === window.location.hostname) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            // Force a full page reload instead of client-side navigation
            window.location.href = link.href;
          });
        }
      });
    };
    
    // Setup link handlers once DOM is loaded
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

    // Function to detect browser
    const detectBrowser = (): { name: string; version: string } => {
      const userAgent = navigator.userAgent;
      let browserName = "Unknown";
      let browserVersion = "Unknown";
      
      // Firefox
      if (userAgent.match(/firefox|fxios/i)) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/firefox\/(\d+(\.\d+)?)/i)?.[1] || "Unknown";
      } 
      // Safari
      else if (userAgent.match(/safari/i) && !userAgent.match(/chrome|chromium|edg/i)) {
        browserName = "Safari";
        browserVersion = userAgent.match(/version\/(\d+(\.\d+)?)/i)?.[1] || "Unknown";
      } 
      // Edge
      else if (userAgent.match(/edg/i)) {
        browserName = "Edge";
        browserVersion = userAgent.match(/edg\/(\d+(\.\d+)?)/i)?.[1] || "Unknown";
      } 
      // Chrome
      else if (userAgent.match(/chrome|chromium/i)) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/chrome\/(\d+(\.\d+)?)/i)?.[1] || "Unknown";
      } 
      // IE
      else if (userAgent.match(/msie|trident/i)) {
        browserName = "IE";
        browserVersion = userAgent.match(/(?:msie |rv:)(\d+(\.\d+)?)/i)?.[1] || "Unknown";
      }
      
      return { name: browserName, version: browserVersion };
    };

    // Get browser info
    const browserInfo = detectBrowser();

    // Create an object to collect all metrics
    const metrics: MetricsData = {
      pageURL: window.location.href,
      pathname: window.location.pathname,
      pageType: window.location.pathname.includes('/csr') ? 'CSR' : 'SSR',
      deviceInfo: getDeviceInfo(),
      timestamp: new Date().toISOString(),
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
    };

    // Track if metrics have been sent already
    let metricsSent: boolean = false;

    // Function to send metrics to the API
    const sendMetrics = () => {
      if (metricsSent) return;
      
      // Check if we have at least some key metrics before sending
      // Use lcp or lcp_fallback for browsers that don't support LCP
      if (metrics.ttfb && (metrics.lcp || metrics.lcp_fallback)) {
        metricsSent = true;
        
        fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metrics),
        })
          .then(response => response.json())
          .then(data => console.log('Metrics sent successfully:', data))
          .catch(error => console.error('Error sending metrics:', error));
      }
    };

    // Set a fallback timer to ensure metrics are sent
    const timeoutId = setTimeout(() => {
      // If we haven't sent metrics yet, send what we have
      if (!metricsSent) {
        console.log('Sending metrics via timeout fallback');
        metrics.incomplete = true;
        sendMetrics();
      }
    }, 30000); // 10 second timeout

    // Function to safely collect metrics with browser compatibility handling
    const collectMetric = (metricName: string, metricFn: any, onComplete?: () => void) => {
      try {
        metricFn(({ value }: { value: number }) => {
          metrics[metricName] = value;
          console.log(`${metricName}:`, value);
          if (onComplete) onComplete();
        });
      } catch (error) {
        console.warn(`Failed to measure ${metricName}:`, error);
        metrics[`${metricName}_error`] = "Not supported in this browser";
      }
    };

    // Handle each web-vital metric with try-catch for browser compatibility
    
    collectMetric('ttfb', onTTFB, sendMetrics);

    collectMetric('fcp', onFCP);

    collectMetric('lcp', onLCP, sendMetrics);

    collectMetric('cls', onCLS);

    collectMetric('fid', onFID);

    collectMetric('inp', onINP);
    
    if (!('PerformanceObserver' in window) || 
        !PerformanceObserver.supportedEntryTypes || 
        !PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
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
        }, 1000); // Wait a bit after load to ensure timing is complete
      });
    }

    // Clean up on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // This component doesn't render anything
  return null;
}