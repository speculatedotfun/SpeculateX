import { NextResponse } from 'next/server';
import fs from 'fs';
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

// Ensure data directory calls
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read data
function readData(): ReferralRecord[] {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading referral data:', error);
        return [];
    }
}

// Helper to write data
function writeData(data: ReferralRecord[]) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing referral data:', error);
    }
}

export async function GET() {
    const data = readData();
    // Sort by newest first
    const sortedData = data.sort((a, b) => b.timestamp - a.timestamp);
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

        const currentData = readData();
        // Prepend or append - appending is safer for concurrency conceptually, sorting on read
        currentData.push(newRecord);
        writeData(currentData);

        return NextResponse.json({ success: true, count: currentData.length });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
