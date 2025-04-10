'use client';

import { useEffect } from "react";

interface MetricsScriptProps {
    pageType: 'SSR' | 'CSR';
}

export default function MetricsScript({ pageType }: MetricsScriptProps) {
    useEffect(() => {
        // Function to collect performance metrics
        const collectPerformanceMetrics = async () => {
            const metrics = {
                id: crypto.randomUUID(),
                timeStamp: Date.now(),
                pageType,
                ttfb: null as number | null,
                lcp: null as number | null,
                inp: null as number | null,
                userAgent: navigator.userAgent,
                connectionType: (navigator as any).connection?.effectiveType,
                deviceMemory: (navigator as any).deviceMemory,
            };

            // Collect TTFB
            const navigationEntries = performance.getEntriesByType('navigation');
            if (navigationEntries.length > 0) {
                const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming;
                metrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
            }

            // Create LCP Promise
            const lcpPromise = new Promise<number | null>((resolve) => {
                let lcpValue: number | null = null;

                try{
                    const lcpObserve = new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        const lastEntry = entries[entries.length - 1]
                        if (lastEntry) {
                            lcpValue = lastEntry.startTime;
                        }
                    });

                    lcpObserve.observe({ type: 'largest-contentful-paint', buffered: true});

                    setTimeout(() => {
                        lcpObserve.disconnect();
                        resolve(lcpValue);
                    }, 3000);
                } catch (e) {
                    console.error('LCP observe error:', e);
                    resolve(null);
                }
            });

            // Create INP Promise
            const inpPromise = new Promise<number | null>((resolve) => {
                let inpValue: number | null = null;

                try {
                    const inpObserver = new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        console.log('INP entries:', entries);
                        entries.forEach((entry) => {
                            if (!inpValue || (entry as any).interactionId && (entry as any).duration > inpValue) {
                                inpValue = (entry as any).duration;
                            }
                        });
                    });

                    inpObserver.observe({ 
                        type: 'event', 
                        buffered: true,
                    });

                    setTimeout(() => {
                        inpObserver.disconnect();
                        resolve(inpValue)
                    }, 3000);
                } catch (e){
                    console.error('INP observer error', e);
                    resolve(null)
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
                    body: JSON.stringify(metrics)
                });

                if (!response.ok) {
                    throw new Error(response.statusText)
                }
                console.log(`${pageType} metrics collected and saved:`, metrics);
            } catch (error) {
                console.error('Error saving metrics:', error);
            }
        };

        const timer = setTimeout(() => collectPerformanceMetrics(), 100);

        return () => clearTimeout(timer)
    }, [pageType])

    return null
}