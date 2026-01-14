'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { keccak256, stringToBytes } from 'viem';
import { getAddresses, getCurrentNetwork, getChainId } from '@/lib/contracts';
import { getCoreAbi, treasuryAbi, usdcAbi } from '@/lib/abis';

// Role hashes
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));
const TREASURY_WITHDRAWER_ROLE = keccak256(stringToBytes('WITHDRAWER_ROLE'));
const TREASURY_ADMIN_ROLE = keccak256(stringToBytes('ADMIN_ROLE'));
const MINTER_ROLE = keccak256(stringToBytes('MINTER_ROLE'));

export interface AdminRoles {
    // Core contract roles
    hasDefaultAdmin: boolean;
    hasMarketCreator: boolean;

    // Treasury contract roles
    hasTreasuryWithdrawer: boolean;
    hasTreasuryAdmin: boolean;

    // USDC contract roles
    hasUsdcAdmin: boolean;
    hasMinter: boolean;

    // Loading state
    isLoading: boolean;

    // Derived permissions (for easy usage)
    canCreateMarkets: boolean;
    canManageTreasury: boolean;
    canManagePermissions: boolean;
    canManageMinters: boolean;
    canMintUsdc: boolean;
    canManageProtocol: boolean;
    canResolveMarkets: boolean;

    // Is any admin at all
    isAnyAdmin: boolean;
}

export function useAdminRoles(): AdminRoles {
    const { address } = useAccount();
    const publicClient = usePublicClient();

    const [roles, setRoles] = useState<AdminRoles>({
        hasDefaultAdmin: false,
        hasMarketCreator: false,
        hasTreasuryWithdrawer: false,
        hasTreasuryAdmin: false,
        hasUsdcAdmin: false,
        hasMinter: false,
        isLoading: true,
        canCreateMarkets: false,
        canManageTreasury: false,
        canManagePermissions: false,
        canManageMinters: false,
        canMintUsdc: false,
        canManageProtocol: false,
        canResolveMarkets: false,
        isAnyAdmin: false,
    });

    useEffect(() => {
        const checkAllRoles = async () => {
            if (!address || !publicClient) {
                setRoles(prev => ({ ...prev, isLoading: false }));
                return;
            }

            try {
                const addresses = getAddresses();
                const coreAbi = getCoreAbi(getCurrentNetwork());
                const chainId = getChainId(); // Use selected network's chain ID

                // Check all roles in parallel
                const [
                    hasDefaultAdmin,
                    hasMarketCreator,
                    hasTreasuryWithdrawer,
                    hasTreasuryAdmin,
                    hasUsdcAdmin,
                    hasMinter,
                ] = await Promise.all([
                    // Core: DEFAULT_ADMIN_ROLE
                    publicClient.readContract({
                        address: addresses.core,
                        abi: coreAbi,
                        functionName: 'hasRole',
                        args: [DEFAULT_ADMIN_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean>,

                    // Core: MARKET_CREATOR_ROLE
                    publicClient.readContract({
                        address: addresses.core,
                        abi: coreAbi,
                        functionName: 'hasRole',
                        args: [MARKET_CREATOR_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean>,

                    // Treasury: WITHDRAWER_ROLE
                    addresses.treasury ? publicClient.readContract({
                        address: addresses.treasury,
                        abi: treasuryAbi,
                        functionName: 'hasRole',
                        args: [TREASURY_WITHDRAWER_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean> : Promise.resolve(false),

                    // Treasury: ADMIN_ROLE
                    addresses.treasury ? publicClient.readContract({
                        address: addresses.treasury,
                        abi: treasuryAbi,
                        functionName: 'hasRole',
                        args: [TREASURY_ADMIN_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean> : Promise.resolve(false),

                    // USDC: DEFAULT_ADMIN_ROLE
                    publicClient.readContract({
                        address: addresses.usdc,
                        abi: usdcAbi,
                        functionName: 'hasRole',
                        args: [DEFAULT_ADMIN_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean>,

                    // USDC: MINTER_ROLE
                    publicClient.readContract({
                        address: addresses.usdc,
                        abi: usdcAbi,
                        functionName: 'hasRole',
                        args: [MINTER_ROLE, address],
                        chainId: chainId as 56 | 97,
                    }).catch(() => false) as Promise<boolean>,
                ]);

                // Derive permissions
                const defaultAdmin = Boolean(hasDefaultAdmin);
                const marketCreator = Boolean(hasMarketCreator);
                const treasuryWithdrawer = Boolean(hasTreasuryWithdrawer);
                const treasuryAdmin = Boolean(hasTreasuryAdmin);
                const usdcAdmin = Boolean(hasUsdcAdmin);
                const minter = Boolean(hasMinter);

                setRoles({
                    hasDefaultAdmin: defaultAdmin,
                    hasMarketCreator: marketCreator,
                    hasTreasuryWithdrawer: treasuryWithdrawer,
                    hasTreasuryAdmin: treasuryAdmin,
                    hasUsdcAdmin: usdcAdmin,
                    hasMinter: minter,
                    isLoading: false,

                    // Derived
                    canCreateMarkets: defaultAdmin || marketCreator,
                    canManageTreasury: treasuryWithdrawer || treasuryAdmin,
                    canManagePermissions: defaultAdmin,
                    canManageMinters: usdcAdmin,
                    canMintUsdc: minter,
                    canManageProtocol: defaultAdmin,
                    canResolveMarkets: defaultAdmin || marketCreator,
                    isAnyAdmin: defaultAdmin || marketCreator || treasuryWithdrawer || treasuryAdmin || usdcAdmin || minter,
                });
            } catch (error) {
                console.error('Error checking admin roles:', error);
                setRoles(prev => ({ ...prev, isLoading: false }));
            }
        };

        checkAllRoles();
    }, [address, publicClient]);

    return roles;
}
