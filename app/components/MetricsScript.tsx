'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const MetricsScript = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Determine page type based on pathname
  const getPageType = (path: string) => {
    if (path.includes('/ssr')) return 'SSR';
    if (path.includes('/csr')) return 'CSR';
    return 'Other';
  };

  const pageType = getPageType(pathname);

  // Force a hard refresh when navigating between SSR and CSR pages
  const handleNavigation = (href: string) => {
    const currentType = getPageType(pathname);
    const targetType = getPageType(href);
    
    // If changing between SSR and CSR types, force a full page load
    if (currentType !== targetType && (currentType !== 'Other' && targetType !== 'Other')) {
      window.location.href = href; // Force a full page refresh
    } else {
      router.push(href); // Use Next.js client-side navigation
    }
  };

  useEffect(() => {
    // Only collect metrics for SSR and CSR pages
    if (pageType === 'Other') return;

    // Ensure this only runs in the browser
    if (typeof window === 'undefined') return;

    // Reset metrics for each navigation
    window.__PERFORMANCE_METRICS__ = {
      lastNavigationTime: Date.now(),
      lastPathname: pathname,
      inpEntries: [] // Array to store all INP entries for percentile calculation
    };
    
    // Function to collect and send metrics
    const collectAndSendMetrics = async () => {
      // Wait for the page to be fully loaded and metrics to be available
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => setTimeout(collectAndSendMetrics, 100));
        return;
      }

      try {
        // Wait longer after load to ensure all metrics have been calculated
        // especially for LCP which can register late
        setTimeout(async () => {
          // Get basic navigation timing data
          const navigationEntries = performance.getEntriesByType('navigation');
          const navigation = navigationEntries.length > 0 
            ? navigationEntries[0] as PerformanceNavigationTiming 
            : null;
          
          // Get paint timing metrics
          const paintMetrics = performance.getEntriesByType('paint');
          const firstPaint = paintMetrics.find(entry => entry.name === 'first-paint')?.startTime || null;
          const firstContentfulPaint = paintMetrics.find(entry => entry.name === 'first-contentful-paint')?.startTime || null;
          
          // Get values from our global storage
          const metricsStore = window.__PERFORMANCE_METRICS__ || {};
          
          // Get Time to First Byte (only if navigation data is available)
          const ttfb = navigation ? navigation.responseStart - navigation.requestStart : null;
          
          // Calculate INP as 75th percentile if we have enough entries
          let interactionToNextPaint = null;
          if (metricsStore.inpEntries && metricsStore.inpEntries.length > 0) {
            // Sort entries by duration
            const sortedEntries = [...metricsStore.inpEntries].sort((a, b) => a - b);
            // Get the 75th percentile
            const idx = Math.floor(sortedEntries.length * 0.75);
            interactionToNextPaint = sortedEntries[idx];
          } else {
            interactionToNextPaint = metricsStore.inp || null;
          }
          
          // Create the metrics object
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
            largestContentfulPaint: metricsStore.lcp || null,
            interactionToNextPaint,
            firstInputDelay: metricsStore.fid || null,
            navigationType: navigation ? navigation.type : 'unknown',
            deviceInfo: {
              userAgent: navigator.userAgent,
              deviceMemory: 'deviceMemory' in navigator ? navigator.deviceMemory : undefined,
              connection: 'connection' in navigator ? {
                // @ts-expect-error
                type: navigator.connection?.effectiveType,
                // @ts-expect-error
                downlink: navigator.connection?.downlink,
                // @ts-expect-error
                rtt: navigator.connection?.rtt,
              } : undefined,
            
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              }
            }
            
          };

          // Send metrics to the API
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
        }, 3000); // Wait 3 seconds after load to collect final metrics (increased from 1s)
      } catch (error) {
        console.error('Error sending performance metrics:', error);
      }
    };

    // Set up observers
    setupPerformanceObservers();
    
    // Call function to collect metrics
    collectAndSendMetrics();
    
    // Intercept all link clicks to force refresh when necessary
    const interceptLinks = () => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (link && link.getAttribute('href')) {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('#')) {
            e.preventDefault();
            handleNavigation(href);
          }
        }
      });
    };
    
    interceptLinks();
    
    // Cleanup function
    return () => {
      document.removeEventListener('click', interceptLinks);
    };
    
  }, [pathname, pageType, router]);

  // Set up performance observers
  const setupPerformanceObservers = () => {
    if (!('PerformanceObserver' in window)) return;
    
    // Initialize metrics storage if needed
    if (!window.__PERFORMANCE_METRICS__) {
      window.__PERFORMANCE_METRICS__ = {
        inpEntries: []
      };
    }

    // Observe LCP - Take the last entry as the final LCP value
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          // Store LCP value in our global store
          if (window.__PERFORMANCE_METRICS__) {
            window.__PERFORMANCE_METRICS__.lcp = lastEntry.startTime;
          }
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observation not supported', e);
    }

    // Observe INP/interaction metrics - Store all entries for percentile calculation
    try {
      const interactionObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          entries.forEach((entry) => {
            const interaction = entry as PerformanceEventTiming; // ✅ Correct type
      
            if (window.__PERFORMANCE_METRICS__?.inpEntries) {
              window.__PERFORMANCE_METRICS__.inpEntries.push(interaction.duration);
            }
      
            if (window.__PERFORMANCE_METRICS__) {
              window.__PERFORMANCE_METRICS__.inp = interaction.duration;
            }
          });
        }
      });
      
      // Type-safe observer configuration
      try {
        interactionObserver.observe({ 
          type: 'event', 
          buffered: true,
          // @ts-expect-error
          durationThreshold: 16 
        });
      } catch (e) {
        interactionObserver.observe({ 
          type: 'event', 
          buffered: true 
        });
      }
    } catch (e) {
      console.warn('Interaction observation not supported', e);
    }

    // Observe FID
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const entry = entries[0] as PerformanceEventTiming;
          const delay = entry.processingStart - entry.startTime;
          
          // Store the FID value
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

  // Custom navigation component
  return (
    <div className="metrics-script-navigation" style={{ display: 'none' }}>
      {/* This component doesn't render anything visible but adds navigation handlers */}
    </div>
  );
};

// Export a custom link component that forces full page loads between SSR/CSR
export const MetricsLink = ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
  const pathname = usePathname();
  
  const getPageType = (path: string) => {
    if (path.includes('/ssr')) return 'SSR';
    if (path.includes('/csr')) return 'CSR';
    return 'Other';
  };
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const currentType = getPageType(pathname);
    const targetType = getPageType(href);
    
    // If changing between SSR and CSR types, let the default link behavior happen (full page load)
    if (currentType !== targetType && (currentType !== 'Other' && targetType !== 'Other')) {
      // Don't prevent default - allow normal link behavior for a full page refresh
      return;
    } else {
      // For same type navigation, use Next.js client-side routing
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

// Required for TypeScript
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