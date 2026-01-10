import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'usernames.json');

interface UsernameEntry {
    username: string;
    address: string;
    createdAt: number;
}

function readData(): Record<string, UsernameEntry> {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, '{}', 'utf-8');
            return {};
        }
        const raw = fs.readFileSync(DATA_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('[Usernames] Failed to read data:', e);
        return {};
    }
}

function writeData(data: Record<string, UsernameEntry>) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[Usernames] Failed to write data:', e);
    }
}

// Validate username: 3-20 chars, alphanumeric + underscores
function isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// GET: Lookup by username, address, or multiple addresses
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase();
    const address = searchParams.get('address')?.toLowerCase();
    const addresses = searchParams.get('addresses')?.toLowerCase();

    const data = readData();

    // Bulk lookup by addresses
    if (addresses) {
        const addressList = addresses.split(',').map(a => a.trim());
        const results: Record<string, string> = {};

        // Build address -> username map
        const addressToUsername: Record<string, string> = {};
        Object.values(data).forEach(entry => {
            addressToUsername[entry.address.toLowerCase()] = entry.username;
        });

        addressList.forEach(addr => {
            if (addressToUsername[addr]) {
                results[addr] = addressToUsername[addr];
            }
        });

        return NextResponse.json({ found: true, usernames: results });
    }

    if (username) {
        const entry = data[username];
        if (entry) {
            return NextResponse.json({ found: true, ...entry });
        }
        return NextResponse.json({ found: false });
    }

    if (address) {
        const entry = Object.values(data).find(e => e.address.toLowerCase() === address);
        if (entry) {
            return NextResponse.json({ found: true, ...entry });
        }
        return NextResponse.json({ found: false });
    }

    return NextResponse.json({ error: 'Provide ?username=, ?address=, or ?addresses=' }, { status: 400 });
}

// POST: Register a new username
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, address } = body;

        if (!username || !address) {
            return NextResponse.json({ error: 'Missing username or address' }, { status: 400 });
        }

        const normalizedUsername = username.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();

        if (!isValidUsername(normalizedUsername)) {
            return NextResponse.json({
                error: 'Invalid username. Use 3-20 alphanumeric characters or underscores.'
            }, { status: 400 });
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
        }

        const data = readData();

        // Check if username is taken
        if (data[normalizedUsername]) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        // Check if address already has a username
        const existingEntry = Object.values(data).find(e => e.address.toLowerCase() === normalizedAddress);
        if (existingEntry) {
            return NextResponse.json({
                error: 'Address already has a username',
                existingUsername: existingEntry.username
            }, { status: 409 });
        }

        // Register the username
        data[normalizedUsername] = {
            username: normalizedUsername,
            address: normalizedAddress,
            createdAt: Date.now(),
        };

        writeData(data);

        return NextResponse.json({
            success: true,
            username: normalizedUsername,
            address: normalizedAddress,
        });

    } catch (e) {
        console.error('[Usernames] POST error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Change an existing username
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { newUsername, address } = body;

        if (!newUsername || !address) {
            return NextResponse.json({ error: 'Missing newUsername or address' }, { status: 400 });
        }

        const normalizedNewUsername = newUsername.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();

        if (!isValidUsername(normalizedNewUsername)) {
            return NextResponse.json({
                error: 'Invalid username. Use 3-20 alphanumeric characters or underscores.'
            }, { status: 400 });
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
        }

        const data = readData();

        // Check if new username is already taken
        if (data[normalizedNewUsername]) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        // Find and remove old username for this address
        let oldUsername: string | null = null;
        for (const [key, entry] of Object.entries(data)) {
            if (entry.address.toLowerCase() === normalizedAddress) {
                oldUsername = key;
                delete data[key];
                break;
            }
        }

        // Register the new username
        data[normalizedNewUsername] = {
            username: normalizedNewUsername,
            address: normalizedAddress,
            createdAt: Date.now(),
        };

        writeData(data);

        return NextResponse.json({
            success: true,
            oldUsername,
            username: normalizedNewUsername,
            address: normalizedAddress,
        });

    } catch (e) {
        console.error('[Usernames] PUT error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
