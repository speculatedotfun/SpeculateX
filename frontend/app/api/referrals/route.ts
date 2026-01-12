import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Define the path to the local data file
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'referrals.json');

// Interface for the referral record
interface ReferralRecord {
    timestamp: number;
    referrer: string;
    user: string;
    txHash: string;
    marketId: number;
    amount: string;
    type: string;
}

// In-memory cache with TTL
let cache: {
    data: ReferralRecord[];
    timestamp: number;
} | null = null;

const CACHE_TTL = 10000; // 10 seconds

// Ensure data directory exists (async)
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Helper to read data
async function readData(): Promise<ReferralRecord[]> {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.data;
    }

    await ensureDataDir();

    try {
        await fs.access(DATA_FILE);
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // Update cache
        cache = { data, timestamp: Date.now() };
        return data;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            const emptyData: ReferralRecord[] = [];
            cache = { data: emptyData, timestamp: Date.now() };
            return emptyData;
        }
        console.error('Error reading referral data:', error);
        return [];
    }
}

// Helper to write data
async function writeData(data: ReferralRecord[]) {
    await ensureDataDir();
    
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        // Invalidate cache on write
        cache = { data, timestamp: Date.now() };
    } catch (error) {
        console.error('Error writing referral data:', error);
        // Invalidate cache on error to force fresh read
        cache = null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const referrer = searchParams.get('referrer')?.toLowerCase();
    const referrers = searchParams.get('referrers')?.toLowerCase();

    const data = await readData();

    // Bulk lookup by referrers
    if (referrers) {
        const referrerList = referrers.split(',').map(a => a.trim());
        const results: Record<string, ReferralRecord[]> = {};

        referrerList.forEach(addr => {
            results[addr] = data.filter(r => r.referrer.toLowerCase() === addr);
        });

        return NextResponse.json({ success: true, data: results });
    }

    // Filter by single referrer if provided
    let filteredData = data;
    if (referrer) {
        filteredData = data.filter(r => r.referrer.toLowerCase() === referrer);
    }

    // Sort by newest first
    const sortedData = filteredData.sort((a, b) => b.timestamp - a.timestamp);
    return NextResponse.json(sortedData);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.referrer || !body.user || !body.txHash) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const newRecord: ReferralRecord = {
            timestamp: Date.now(),
            referrer: body.referrer,
            user: body.user,
            txHash: body.txHash,
            marketId: body.marketId || 0,
            amount: body.amount || '0',
            type: body.type || 'unknown'
        };

        const currentData = await readData();
        // Prepend or append - appending is safer for concurrency conceptually, sorting on read
        currentData.push(newRecord);
        await writeData(currentData);

        return NextResponse.json({ success: true, count: currentData.length });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
