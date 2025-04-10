import { NextRequest, NextResponse } from "next/server";
import fs from 'fs/promises';
import path from "path";

interface PerformanceMetrics {
    id: string;
    timestamp: number;
    pageType: 'SSR' | 'CSR';
    ttfb: number | null;
    lcp: number | null;
    inp: number | null;
    userAgent: string;
    connectionType?: string;
    deviceMemory?: number;
}

export async function POST(request: NextRequest) {
    try {
        const metrics: PerformanceMetrics = await request.json();

        // Directory
        const metricsDir = path.join(process.cwd(), 'metrics');
        try {
            await fs.access(metricsDir)
        } catch (e) {
            await fs.mkdir(metricsDir, { recursive: true })
            console.log(e)
        }

        const jsonPath = path.join(metricsDir, 'performance_metrics.json')
        let existingMetrics: PerformanceMetrics[] = []
        try {
            const fileData = await fs.readFile(jsonPath, 'utf-8')
            existingMetrics = JSON.parse(fileData)
        } catch (e) {
            console.log(e)
        }
        existingMetrics.push(metrics)
        await fs.writeFile(jsonPath, JSON.stringify(existingMetrics, null, 2));


        const csvPath = path.join(metricsDir, 'performance_metrics.cvs')
        let csvExits = false

        try {
            await fs.access(csvPath)
            csvExits = true
        }catch (e){
            console.log(e)
        }

        let csvData = '';
        if (!csvExits) {
            csvData = 'id,timestamp,pageType,ttfb,lcp,inp,userAgent,connectionType,deviceMemory\n';
        }

        csvData += `${metrics.id},${metrics.timestamp},"${metrics.pageType}",${metrics.ttfb},${metrics.lcp},${metrics.inp},"${metrics.userAgent}","${metrics.connectionType || ''}",${metrics.deviceMemory || ''}\n`;
    
        await fs.appendFile(csvPath, csvData);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving metrics:', error);
        return NextResponse.json(
          { error: 'Failed to save metrics' },
          { status: 500 }
        );
    }
}