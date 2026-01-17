import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

// Interface for the referral record
interface ReferralRecord {
    timestamp: number;
    referrer: string;
    user: string;
    txHash: string;
    marketId: number;
    amount: string;
    type: string;
    chainId?: string;
}

function normalizeChainId(raw: string | null): string {
    if (raw && /^[0-9]+$/.test(raw)) return raw;
    const fallback = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (fallback && /^[0-9]+$/.test(fallback)) return fallback;
    return 'unknown';
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const referrer = searchParams.get('referrer')?.toLowerCase();
    const referrers = searchParams.get('referrers')?.toLowerCase();
    const chainId = normalizeChainId(searchParams.get('chainId'));
    const supabase = getSupabaseServerClient();

    // Bulk lookup by referrers
    if (referrers) {
        const referrerList = referrers.split(',').map(a => a.trim());
        const { data, error } = await supabase
            .from('referrals')
            .select('timestamp,referrer,user_address,tx_hash,market_id,amount,type')
            .eq('chain_id', chainId)
            .in('referrer', referrerList);

        if (error) {
            console.error('[Referrals] Bulk lookup error:', error);
            return NextResponse.json({ success: false, chainId }, { status: 500 });
        }

        const results: Record<string, ReferralRecord[]> = {};
        referrerList.forEach(addr => {
            results[addr] = (data ?? [])
                .filter(r => r.referrer.toLowerCase() === addr)
                .map(r => ({
                    timestamp: Number(r.timestamp),
                    referrer: r.referrer,
                    user: r.user_address,
                    txHash: r.tx_hash,
                    marketId: r.market_id,
                    amount: r.amount,
                    type: r.type,
                    chainId,
                }));
        });

        return NextResponse.json({ success: true, data: results, chainId });
    }

    const query = supabase
        .from('referrals')
        .select('timestamp,referrer,user_address,tx_hash,market_id,amount,type')
        .eq('chain_id', chainId)
        .order('timestamp', { ascending: false });

    if (referrer) {
        query.eq('referrer', referrer);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[Referrals] Lookup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const mapped = (data ?? []).map(r => ({
        timestamp: Number(r.timestamp),
        referrer: r.referrer,
        user: r.user_address,
        txHash: r.tx_hash,
        marketId: r.market_id,
        amount: r.amount,
        type: r.type,
        chainId,
    }));

    return NextResponse.json(mapped);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const chainKey = normalizeChainId(body.chainId ? String(body.chainId) : null);
        const supabase = getSupabaseServerClient();

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
            type: body.type || 'unknown',
            chainId: chainKey,
        };
        const { error } = await supabase
            .from('referrals')
            .insert({
                chain_id: chainKey,
                timestamp: newRecord.timestamp,
                referrer: newRecord.referrer,
            user_address: newRecord.user,
                tx_hash: newRecord.txHash,
                market_id: newRecord.marketId,
                amount: newRecord.amount,
                type: newRecord.type,
            });

        if (error) {
            console.error('[Referrals] Insert error:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        return NextResponse.json({ success: true, chainId: chainKey });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
