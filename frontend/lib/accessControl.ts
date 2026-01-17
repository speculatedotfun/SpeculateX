import { getAddresses, getCurrentNetwork } from './contracts';
import { getPublicClient } from 'wagmi/actions';
import { config } from './wagmi';
import { getCoreAbi } from './abis';
import { keccak256, stringToBytes } from 'viem';
import { getChainId } from './contracts';

const adminRoleCache = new Map<string, boolean>();

export function clearAdminRoleCache() {
    adminRoleCache.clear();
}

// Helper to get public client for current network (matches hooks.ts usage)
function getClientForCurrentNetwork() {
    const chainId = getChainId();
    return getPublicClient(config, { chainId: chainId as 56 | 97 });
}

// Check if an address is an admin (has DEFAULT_ADMIN_ROLE or MARKET_CREATOR_ROLE)
export async function isAdmin(address: `0x${string}`): Promise<boolean> {
    if (!address) return false;

    const normalized = address.toLowerCase();
    const chainId = getChainId();
    const cacheKey = `${chainId}:${normalized}`;

    if (adminRoleCache.has(cacheKey)) {
        return adminRoleCache.get(cacheKey)!;
    }

    // Check against configured admin address first (fast path)
    const addresses = getAddresses();
    if (addresses.admin && normalized === addresses.admin.toLowerCase()) {
        adminRoleCache.set(cacheKey, true);
        return true;
    }

    try {
        const publicClient = getClientForCurrentNetwork();
        const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));

        // Check both DEFAULT_ADMIN_ROLE and MARKET_CREATOR_ROLE
        const [hasAdminRole, hasMarketCreatorRole] = await Promise.all([
            publicClient.readContract({
                address: addresses.core,
                abi: getCoreAbi(getCurrentNetwork()),
                functionName: 'hasRole',
                args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
            }) as Promise<boolean>,
            publicClient.readContract({
                address: addresses.core,
                abi: getCoreAbi(getCurrentNetwork()),
                functionName: 'hasRole',
                args: [MARKET_CREATOR_ROLE as `0x${string}`, address],
            }) as Promise<boolean>
        ]);

        if (hasAdminRole || hasMarketCreatorRole) {
            adminRoleCache.set(cacheKey, true);
            return true;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('exceeds defined limit')) {
            console.error('Error checking admin status:', error);
        }
    }

    adminRoleCache.set(cacheKey, false);
    return false;
}

// Check if an address has DEFAULT_ADMIN_ROLE (for admin UI access)
export async function hasDefaultAdminRole(address: `0x${string}`): Promise<boolean> {
    if (!address) return false;

    const normalized = address.toLowerCase();
    const addresses = getAddresses();
    
    // Check against configured admin address first (fast path)
    if (addresses.admin && normalized === addresses.admin.toLowerCase()) {
        return true;
    }

    try {
        const publicClient = getClientForCurrentNetwork();
        const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        const hasAdminRole = await publicClient.readContract({
            address: addresses.core,
            abi: getCoreAbi(getCurrentNetwork()),
            functionName: 'hasRole',
            args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
        }) as boolean;

        return hasAdminRole;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('exceeds defined limit')) {
            console.error('Error checking DEFAULT_ADMIN_ROLE:', error);
        }
        return false;
    }
}

// Check if an address can create markets (has MARKET_CREATOR_ROLE)
export async function canCreateMarkets(address: `0x${string}`): Promise<boolean> {
    if (!address) return false;

    const normalized = address.toLowerCase();

    try {
        const addresses = getAddresses();
        const publicClient = getClientForCurrentNetwork();
        // Calculate MARKET_CREATOR_ROLE using keccak256("MARKET_CREATOR_ROLE")
        const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));
        const hasCreatorRole = await publicClient.readContract({
            address: addresses.core,
            abi: getCoreAbi(getCurrentNetwork()),
            functionName: 'hasRole',
            args: [MARKET_CREATOR_ROLE, address],
        }) as boolean;

        return hasCreatorRole;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('exceeds defined limit')) {
            console.error('Error checking market creator status:', error);
        }
        return false;
    }
}
