import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

interface Comment {
    id: string;
    marketId: string;
    user: string;
    text: string;
    timestamp: number;
    side?: 'yes' | 'no';
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readComments(): Comment[] {
    try {
        if (!fs.existsSync(COMMENTS_FILE)) {
            return [];
        }
        const data = fs.readFileSync(COMMENTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to read comments:', e);
        return [];
    }
}

function writeComments(comments: Comment[]) {
    try {
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to write comments:', e);
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');

    if (!marketId) {
        return NextResponse.json({ error: 'Market ID required' }, { status: 400 });
    }

    const allComments = readComments();
    const marketComments = allComments
        .filter(c => c.marketId === marketId)
        .sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(marketComments);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { marketId, user, text, side } = body;

        if (!marketId || !user || !text) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const newComment: Comment = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            marketId,
            user: user.toLowerCase(),
            text: text.slice(0, 500), // Limit length
            timestamp: Date.now(),
            side,
        };

        const comments = readComments();
        comments.push(newComment);
        writeComments(comments);

        return NextResponse.json(newComment);
    } catch (e) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
