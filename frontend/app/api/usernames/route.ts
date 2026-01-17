import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

function normalizeChainId(raw: string | null): string {
    if (raw && /^[0-9]+$/.test(raw)) return raw;
    const fallback = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (fallback && /^[0-9]+$/.test(fallback)) return fallback;
    return 'unknown';
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
    const chainId = normalizeChainId(searchParams.get('chainId'));
    const supabase = getSupabaseServerClient();

    // Bulk lookup by addresses
    if (addresses) {
        const addressList = addresses.split(',').map(a => a.trim());
        const { data, error } = await supabase
            .from('usernames')
            .select('username,address,created_at')
            .eq('chain_id', chainId)
            .in('address', addressList);

        if (error) {
            console.error('[Usernames] Bulk lookup error:', error);
            return NextResponse.json({ found: false, chainId }, { status: 500 });
        }

        const results: Record<string, string> = {};
        (data ?? []).forEach(entry => {
            results[entry.address.toLowerCase()] = entry.username;
        });

        return NextResponse.json({ found: true, usernames: results, chainId });
    }

    if (username) {
        const { data, error } = await supabase
            .from('usernames')
            .select('username,address,created_at')
            .eq('chain_id', chainId)
            .eq('username', username)
            .maybeSingle();

        if (error) {
            console.error('[Usernames] Username lookup error:', error);
            return NextResponse.json({ found: false, chainId }, { status: 500 });
        }

        if (data) {
            return NextResponse.json({
                found: true,
                username: data.username,
                address: data.address,
                createdAt: data.created_at ? Date.parse(data.created_at) : Date.now(),
                chainId,
            });
        }

        return NextResponse.json({ found: false, chainId });
    }

    if (address) {
        const { data, error } = await supabase
            .from('usernames')
            .select('username,address,created_at')
            .eq('chain_id', chainId)
            .eq('address', address)
            .maybeSingle();

        if (error) {
            console.error('[Usernames] Address lookup error:', error);
            return NextResponse.json({ found: false, chainId }, { status: 500 });
        }

        if (data) {
            return NextResponse.json({
                found: true,
                username: data.username,
                address: data.address,
                createdAt: data.created_at ? Date.parse(data.created_at) : Date.now(),
                chainId,
            });
        }

        return NextResponse.json({ found: false, chainId });
    }

    return NextResponse.json({ error: 'Provide ?username=, ?address=, or ?addresses=' }, { status: 400 });
}

// POST: Register a new username
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, address, chainId } = body;

        if (!username || !address) {
            return NextResponse.json({ error: 'Missing username or address' }, { status: 400 });
        }

        const normalizedUsername = username.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();
        const chainKey = normalizeChainId(chainId ? String(chainId) : null);
        const supabase = getSupabaseServerClient();

        if (!isValidUsername(normalizedUsername)) {
            return NextResponse.json({
                error: 'Invalid username. Use 3-20 alphanumeric characters or underscores.'
            }, { status: 400 });
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
        }

        const { data: existingUsername } = await supabase
            .from('usernames')
            .select('username,address')
            .eq('chain_id', chainKey)
            .eq('username', normalizedUsername)
            .maybeSingle();

        if (existingUsername) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        const { data: existingAddress } = await supabase
            .from('usernames')
            .select('username,address')
            .eq('chain_id', chainKey)
            .eq('address', normalizedAddress)
            .maybeSingle();

        if (existingAddress) {
            return NextResponse.json({
                error: 'Address already has a username',
                existingUsername: existingAddress.username
            }, { status: 409 });
        }

        const { data: inserted, error } = await supabase
            .from('usernames')
            .insert({
                chain_id: chainKey,
                username: normalizedUsername,
                address: normalizedAddress,
            })
            .select('username,address,created_at')
            .single();

        if (error || !inserted) {
            console.error('[Usernames] Insert error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            username: inserted.username,
            address: inserted.address,
            createdAt: inserted.created_at ? Date.parse(inserted.created_at) : Date.now(),
            chainId: chainKey,
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
        const { newUsername, address, chainId } = body;

        if (!newUsername || !address) {
            return NextResponse.json({ error: 'Missing newUsername or address' }, { status: 400 });
        }

        const normalizedNewUsername = newUsername.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase();
        const chainKey = normalizeChainId(chainId ? String(chainId) : null);
        const supabase = getSupabaseServerClient();

        if (!isValidUsername(normalizedNewUsername)) {
            return NextResponse.json({
                error: 'Invalid username. Use 3-20 alphanumeric characters or underscores.'
            }, { status: 400 });
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
        }

        const { data: existingUsername } = await supabase
            .from('usernames')
            .select('username,address')
            .eq('chain_id', chainKey)
            .eq('username', normalizedNewUsername)
            .maybeSingle();

        if (existingUsername && existingUsername.address.toLowerCase() !== normalizedAddress) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        const { data: currentEntry } = await supabase
            .from('usernames')
            .select('username,address')
            .eq('chain_id', chainKey)
            .eq('address', normalizedAddress)
            .maybeSingle();

        const { data: updated, error } = await supabase
            .from('usernames')
            .upsert({
                chain_id: chainKey,
                username: normalizedNewUsername,
                address: normalizedAddress,
            }, { onConflict: 'chain_id,address' })
            .select('username,address,created_at')
            .single();

        if (error || !updated) {
            console.error('[Usernames] Update error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            oldUsername: currentEntry?.username ?? null,
            username: updated.username,
            address: updated.address,
            createdAt: updated.created_at ? Date.parse(updated.created_at) : Date.now(),
            chainId: chainKey,
        });

    } catch (e) {
        console.error('[Usernames] PUT error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
