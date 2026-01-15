'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useChainId } from 'wagmi';
import { getAddresses, getCurrentNetwork, getNetwork } from '@/lib/contracts';
import { getCoreAbi, getChainlinkResolverAbi, treasuryAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/accessControl';
import { keccak256, stringToBytes, decodeErrorResult } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ConfirmDialog, ConfirmDialogType } from '@/components/ui/ConfirmDialog';
import { Shield, UserPlus, X, Link, Database, Loader2, CheckCircle2, Zap, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CRYPTO_ASSETS } from '@/lib/assets';
const chainlinkResolverAbi = getChainlinkResolverAbi(getNetwork());


export default function AdminManager() {
  const { address } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [chainlinkResolverAddress, setChainlinkResolverAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasDefaultAdminRole, setHasDefaultAdminRole] = useState(false);
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
  const [selectedFeed, setSelectedFeed] = useState('');
  const [feedAddress, setFeedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validAddress, setValidAddress] = useState(false);
  const [validResolverAddress, setValidResolverAddress] = useState(false);
  const [validFeedAddress, setValidFeedAddress] = useState(false);
  const [currentResolver, setCurrentResolver] = useState<string | null>(null);
  const [isCheckingResolver, setIsCheckingResolver] = useState(false);
  const [markets, setMarkets] = useState<Array<{ id: number; question: string; expiryTimestamp: string; isResolved: boolean; expired: boolean }>>([]);

  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [resolvingMarketId, setResolvingMarketId] = useState<number | null>(null);

  // Admin management states
  const [revokeAdminAddress, setRevokeAdminAddress] = useState('');
  const [transferFromAddress, setTransferFromAddress] = useState('');
  const [transferToAddress, setTransferToAddress] = useState('');
  const [validRevokeAddress, setValidRevokeAddress] = useState(false);
  const [validTransferFromAddress, setValidTransferFromAddress] = useState(false);
  const [validTransferToAddress, setValidTransferToAddress] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Permissions manager (single address)
  const [permissionsAddress, setPermissionsAddress] = useState('');
  const [validPermissionsAddress, setValidPermissionsAddress] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permCoreAdmin, setPermCoreAdmin] = useState<boolean | null>(null);
  const [permMarketCreator, setPermMarketCreator] = useState<boolean | null>(null);
  const [permTreasuryWithdrawer, setPermTreasuryWithdrawer] = useState<boolean | null>(null);
  const [permTreasuryAdmin, setPermTreasuryAdmin] = useState<boolean | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: ConfirmDialogType;
    addressDisplay?: string;
    roleInfo?: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', description: '', type: 'danger', onConfirm: async () => { } });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Contracts hooks... (same logic as before)
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));
  const TREASURY_WITHDRAWER_ROLE = keccak256(stringToBytes('WITHDRAWER_ROLE'));
  const TREASURY_ADMIN_ROLE = keccak256(stringToBytes('ADMIN_ROLE'));

  const { writeContractAsync: addAdminAsync } = useWriteContract();
  const { writeContract: removeAdmin } = useWriteContract();
  const { writeContractAsync: setChainlinkResolverAsync } = useWriteContract();
  const { writeContractAsync: setGlobalFeedAsync } = useWriteContract();
  const { writeContractAsync: resolveMarketAsync } = useWriteContract();
  const { writeContractAsync: revokeAdminAsync } = useWriteContract();
  const { writeContractAsync: transferAdminAsync } = useWriteContract();
  const { writeContractAsync: treasuryGrantRoleAsync } = useWriteContract();
  const { writeContractAsync: treasuryRevokeRoleAsync } = useWriteContract();

  // Check current resolver address
  const addresses = getAddresses();
  const { data: resolverAddress, refetch: refetchResolver } = useReadContract({
    address: addresses.core,
    abi: getCoreAbi(getCurrentNetwork()),
    functionName: 'chainlinkResolver',
    args: [],
    query: { enabled: !!addresses.core },
  });

  // Use shared assets directory


  // Load initial admin (check if current user is admin)
  useEffect(() => {
    if (address) {
      setIsLoading(true);
      checkIsAdmin(address).then((result) => {
        setIsAdmin(result);
        setIsLoading(false);
      });
    } else {
      setIsAdmin(false);
    }
  }, [address, walletChainId]);

  // Check if user has DEFAULT_ADMIN_ROLE specifically (for permission management)
  useEffect(() => {
    const checkDefaultAdminRole = async () => {
      if (!address || !publicClient) {
        setHasDefaultAdminRole(false);
        return;
      }

      try {
        const addresses = getAddresses();
        const hasRole = await publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
        }) as boolean;

        setHasDefaultAdminRole(hasRole);
      } catch (error) {
        console.error('Error checking DEFAULT_ADMIN_ROLE:', error);
        setHasDefaultAdminRole(false);
      }
    };

    checkDefaultAdminRole();
  }, [address, publicClient]);

  // Real-time address validation
  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(newAdminAddress);
    setValidAddress(isValid);
  }, [newAdminAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(chainlinkResolverAddress);
    setValidResolverAddress(isValid);
  }, [chainlinkResolverAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(feedAddress);
    setValidFeedAddress(isValid);
  }, [feedAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(revokeAdminAddress);
    setValidRevokeAddress(isValid);
  }, [revokeAdminAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(permissionsAddress);
    setValidPermissionsAddress(isValid);
  }, [permissionsAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(transferFromAddress);
    setValidTransferFromAddress(isValid);
  }, [transferFromAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(transferToAddress);
    setValidTransferToAddress(isValid);
  }, [transferToAddress]);

  // Treasury (money-only) role management
  const [treasuryRoleAddress, setTreasuryRoleAddress] = useState('');
  const [validTreasuryRoleAddress, setValidTreasuryRoleAddress] = useState(false);
  const [treasuryHasWithdrawer, setTreasuryHasWithdrawer] = useState<boolean | null>(null);
  const [treasuryHasAdmin, setTreasuryHasAdmin] = useState<boolean | null>(null);
  const [loadingTreasuryRoles, setLoadingTreasuryRoles] = useState(false);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(treasuryRoleAddress);
    setValidTreasuryRoleAddress(isValid);
  }, [treasuryRoleAddress]);

  // Core market-ops role (market creation only, no admin)
  const [marketCreatorAddress, setMarketCreatorAddress] = useState('');
  const [validMarketCreatorAddress, setValidMarketCreatorAddress] = useState(false);
  const [coreHasMarketCreator, setCoreHasMarketCreator] = useState<boolean | null>(null);
  const [loadingCoreCreatorRole, setLoadingCoreCreatorRole] = useState(false);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(marketCreatorAddress);
    setValidMarketCreatorAddress(isValid);
  }, [marketCreatorAddress]);

  // Update current resolver when data changes
  useEffect(() => {
    if (resolverAddress) {
      const resolver = resolverAddress as `0x${string}`;
      setCurrentResolver(resolver);
      if (resolver !== '0x0000000000000000000000000000000000000000') {
        setChainlinkResolverAddress(resolver);
      }
    } else if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      setCurrentResolver(null);
    }
  }, [resolverAddress]);

  // Load markets that can be resolved
  const loadResolvableMarkets = async () => {
    if (!publicClient || !addresses.core || !currentResolver || currentResolver === '0x0000000000000000000000000000000000000000') {
      setMarkets([]);
      return;
    }

    try {
      setLoadingMarkets(true);
      const { getMarketCount, getMarket } = await import('@/lib/hooks');
      const count = await getMarketCount();
      const now = Math.floor(Date.now() / 1000);

      const marketList: Array<{ id: number; question: string; expiryTimestamp: string; isResolved: boolean; expired: boolean }> = [];


      // Check up to 50 markets (to avoid too many calls)
      const maxMarkets = Number(count) > 50 ? 50 : Number(count);
      for (let i = 1; i <= maxMarkets; i++) {
        try {
          const market = await getMarket(BigInt(i));
          if (market && market.resolution) {
            const expiry = Number(market.resolution.expiryTimestamp);
            const isResolved = market.resolution.isResolved;
            const expired = expiry > 0 && expiry < now;

            // Only show markets that are expired but not resolved, and have Chainlink oracle
            if (expired && !isResolved && market.resolution.oracleType === 1) {
              marketList.push({
                id: i,
                question: market.question || `Market #${i}`,
                expiryTimestamp: market.resolution.expiryTimestamp.toString(),
                isResolved: false,
                expired: true,
              });
            }
          }
        } catch (e) {
          // Market doesn't exist or error reading, skip
          continue;
        }
      }

      setMarkets(marketList);
    } catch (e) {
      console.error('Error loading markets:', e);
      pushToast({ title: 'Error', description: 'Failed to load markets', type: 'error' });
    } finally {
      setLoadingMarkets(false);
    }
  };

  // Load markets when resolver is available
  useEffect(() => {
    if (currentResolver && currentResolver !== '0x0000000000000000000000000000000000000000' && isAdmin && publicClient) {
      loadResolvableMarkets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolver, isAdmin, publicClient]);

  const refreshTreasuryRoles = async (addr?: string) => {
    const pc = publicClient;
    const target = (addr ?? treasuryRoleAddress).trim();
    if (!pc || !addresses.treasury || !/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      setLoadingTreasuryRoles(true);
      const [hasWithdrawer, hasAdminRole] = await Promise.all([
        pc.readContract({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'hasRole',
          args: [TREASURY_WITHDRAWER_ROLE, target as `0x${string}`],
        }) as Promise<boolean>,
        pc.readContract({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'hasRole',
          args: [TREASURY_ADMIN_ROLE, target as `0x${string}`],
        }) as Promise<boolean>,
      ]);
      setTreasuryHasWithdrawer(Boolean(hasWithdrawer));
      setTreasuryHasAdmin(Boolean(hasAdminRole));
    } catch (e) {
      console.error('Error checking treasury roles:', e);
      pushToast({ title: 'Error', description: 'Failed to check Treasury roles', type: 'error' });
      setTreasuryHasWithdrawer(null);
      setTreasuryHasAdmin(null);
    } finally {
      setLoadingTreasuryRoles(false);
    }
  };

  const refreshCoreMarketCreatorRole = async (addr?: string) => {
    const pc = publicClient;
    const target = (addr ?? marketCreatorAddress).trim();
    if (!pc || !addresses.core || !/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      setLoadingCoreCreatorRole(true);
      const hasCreator = await pc.readContract({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'hasRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, target as `0x${string}`],
      }) as boolean;
      setCoreHasMarketCreator(Boolean(hasCreator));
    } catch (e) {
      console.error('Error checking market creator role:', e);
      pushToast({ title: 'Error', description: 'Failed to check MARKET_CREATOR_ROLE', type: 'error' });
      setCoreHasMarketCreator(null);
    } finally {
      setLoadingCoreCreatorRole(false);
    }
  };

  const handleGrantMarketCreatorRole = async () => {
    if (!publicClient) return;
    const target = marketCreatorAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      pushToast({ title: 'Granting Market Creator Role', description: 'Confirm the transaction…', type: 'info' });
      const h = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      pushToast({ title: 'Success', description: 'MARKET_CREATOR_ROLE granted.', type: 'success' });
      await refreshCoreMarketCreatorRole(target);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to grant MARKET_CREATOR_ROLE', type: 'error' });
    }
  };

  const handleRevokeMarketCreatorRole = async () => {
    if (!publicClient) return;
    const target = marketCreatorAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      pushToast({ title: 'Revoking Market Creator Role', description: 'Confirm the transaction…', type: 'info' });
      const h = await revokeAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      pushToast({ title: 'Success', description: 'MARKET_CREATOR_ROLE revoked.', type: 'success' });
      await refreshCoreMarketCreatorRole(target);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to revoke MARKET_CREATOR_ROLE', type: 'error' });
    }
  };

  const handleGrantTreasuryRoles = async () => {
    if (!publicClient) return;
    const target = treasuryRoleAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      if (!addresses.treasury) throw new Error('Treasury address not configured');

      pushToast({ title: 'Granting Treasury Roles', description: 'Confirm the transactions…', type: 'info' });

      const h1 = await treasuryGrantRoleAsync({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'grantRole',
        args: [TREASURY_WITHDRAWER_ROLE, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h1 });

      const h2 = await treasuryGrantRoleAsync({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'grantRole',
        args: [TREASURY_ADMIN_ROLE, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h2 });

      pushToast({
        title: 'Success',
        description: 'Treasury roles granted (WITHDRAWER_ROLE + ADMIN_ROLE).',
        type: 'success',
      });
      await refreshTreasuryRoles(target);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to grant Treasury roles', type: 'error' });
    }
  };

  const handleRevokeTreasuryRoles = async () => {
    if (!publicClient) return;
    const target = treasuryRoleAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) return;

    try {
      if (!addresses.treasury) throw new Error('Treasury address not configured');

      pushToast({ title: 'Revoking Treasury Roles', description: 'Confirm the transactions…', type: 'info' });

      const h1 = await treasuryRevokeRoleAsync({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'revokeRole',
        args: [TREASURY_WITHDRAWER_ROLE, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h1 });

      const h2 = await treasuryRevokeRoleAsync({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'revokeRole',
        args: [TREASURY_ADMIN_ROLE, target as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h2 });

      pushToast({
        title: 'Success',
        description: 'Treasury roles revoked.',
        type: 'success',
      });
      await refreshTreasuryRoles(target);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to revoke Treasury roles', type: 'error' });
    }
  };

  const refreshPermissions = async (target?: string) => {
    if (!publicClient) return;
    const addr = (target || permissionsAddress).trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return;

    try {
      setLoadingPermissions(true);
      const addresses = getAddresses();

      const [hasCoreAdmin, hasCreator] = await Promise.all([
        publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'hasRole',
          args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
        }) as Promise<boolean>,
      ]);

      setPermCoreAdmin(Boolean(hasCoreAdmin));
      setPermMarketCreator(Boolean(hasCreator));

      if (!addresses.treasury) {
        setPermTreasuryWithdrawer(null);
        setPermTreasuryAdmin(null);
        return;
      }

      const [hasWithdrawer, hasTreasuryAdmin] = await Promise.all([
        publicClient.readContract({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'hasRole',
          args: [TREASURY_WITHDRAWER_ROLE as `0x${string}`, addr as `0x${string}`],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'hasRole',
          args: [TREASURY_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
        }) as Promise<boolean>,
      ]);

      setPermTreasuryWithdrawer(Boolean(hasWithdrawer));
      setPermTreasuryAdmin(Boolean(hasTreasuryAdmin));
    } catch (e) {
      console.error('Error checking permissions:', e);
      pushToast({ title: 'Error', description: 'Failed to check permissions', type: 'error' });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleGrantAllPermissions = async () => {
    if (!publicClient || !validPermissionsAddress) return;
    const addr = permissionsAddress.trim();
    try {
      const addresses = getAddresses();
      pushToast({ title: 'Granting All Roles', description: 'Confirm the transactions…', type: 'info' });

      const h1 = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h1 });

      const h2 = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h2 });

      if (addresses.treasury) {
        const h3 = await treasuryGrantRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'grantRole',
          args: [TREASURY_WITHDRAWER_ROLE, addr as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h3 });

        const h4 = await treasuryGrantRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'grantRole',
          args: [TREASURY_ADMIN_ROLE, addr as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h4 });
      }

      pushToast({ title: 'Success', description: 'All roles granted.', type: 'success' });
      await refreshPermissions(addr);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to grant permissions', type: 'error' });
    }
  };

  const handleRevokeAllPermissions = async () => {
    if (!publicClient || !validPermissionsAddress) return;
    const addr = permissionsAddress.trim();
    try {
      const addresses = getAddresses();
      pushToast({ title: 'Revoking All Roles', description: 'Confirm the transactions…', type: 'info' });

      const h1 = await revokeAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h1 });

      const h2 = await revokeAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: h2 });

      if (addresses.treasury) {
        const h3 = await treasuryRevokeRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'revokeRole',
          args: [TREASURY_WITHDRAWER_ROLE, addr as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h3 });

        const h4 = await treasuryRevokeRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'revokeRole',
          args: [TREASURY_ADMIN_ROLE, addr as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h4 });
      }

      pushToast({ title: 'Success', description: 'All roles revoked.', type: 'success' });
      await refreshPermissions(addr);
    } catch (e: any) {
      pushToast({ title: 'Error', description: e?.message || 'Failed to revoke permissions', type: 'error' });
    }
  };

  // Load current admins - since contract doesn't support enumeration, 
  // we track admins that were added via this UI session
  // For full visibility, check the Role Visualization component which queries known addresses
  const loadCurrentAdmins = async () => {
    if (!publicClient || !addresses.core) return;

    try {
      setLoadingAdmins(true);
      // Since AccessControl doesn't have enumeration, we can only check known addresses
      // The Role Visualization component provides better visibility
      // Here we just verify if connected user is admin
      if (address) {
        const hasAdmin = await publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
        }) as boolean;

        if (hasAdmin && !currentAdmins.includes(address)) {
          setCurrentAdmins(prev => [...prev, address]);
        }
      }
    } catch (e) {
      console.error('Error checking admin status:', e);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Load admins on mount
  useEffect(() => {
    if (isAdmin && publicClient) {
      loadCurrentAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, publicClient]);

  // Handle manual market resolution
  const handleResolveMarket = async (marketId: number) => {
    const pc = publicClient;
    if (!pc) {
      pushToast({ title: 'Error', description: 'Public client not initialized', type: 'error' });
      return;
    }
    if (!currentResolver || currentResolver === '0x0000000000000000000000000000000000000000') {
      pushToast({ title: 'Error', description: 'Chainlink resolver not registered', type: 'error' });
      return;
    }

    try {
      setResolvingMarketId(marketId);
      pushToast({ title: 'Searching Oracle', description: `Finding correct round for market #${marketId}...`, type: 'info' });

      // 1. Get market resolution config to find expiry and oracle address
      const { getMarket } = await import('@/lib/hooks');
      const market = await getMarket(BigInt(marketId));
      if (!market || !market.resolution) throw new Error("Market data not found");

      const expiry = BigInt(market.resolution.expiryTimestamp);
      const oracleAddr = market.resolution.oracleAddress;

      // 2. Find the first round after expiry
      // We'll use a simple search: start from latest and go back
      const aggregatorAbi = [
        { type: 'function', name: 'latestRoundData', inputs: [], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }], stateMutability: 'view' },
        { type: 'function', name: 'getRoundData', inputs: [{ name: '_roundId', type: 'uint80' }], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }], stateMutability: 'view' }
      ] as const;

      const latest: any = await pc.readContract({
        address: oracleAddr as `0x${string}`,
        abi: aggregatorAbi,
        functionName: 'latestRoundData',
      });

      let targetRoundId = latest[0];
      let currentUpdatedAt = latest[3];

      if (currentUpdatedAt < expiry) {
        throw new Error("Oracle hasn't updated since market expiry yet");
      }

      // Helper function to parse Chainlink composite round ID
      // Format: phaseId (upper 16 bits) | aggregatorRoundId (lower 64 bits)
      const parseRoundId = (roundId: bigint) => {
        const phase = Number(roundId >> 64n);
        const aggregatorRound = Number(roundId & 0xFFFFFFFFFFFFFFFFn);
        return { phase, aggregatorRound };
      };

      // Helper function to construct round ID from phase and aggregator round
      const constructRoundId = (phase: number, aggregatorRound: number) => {
        return (BigInt(phase) << 64n) | BigInt(aggregatorRound);
      };

      // Linear search backwards, properly handling phase boundaries
      pushToast({ title: 'Searching', description: 'Verifying historical price rounds...', type: 'info' });

      let found = false;
      for (let i = 0; i < 50; i++) { // Max 50 steps back
        const { phase, aggregatorRound } = parseRoundId(targetRoundId);

        // Check if we're at a phase boundary - cannot go back further
        if (aggregatorRound === 0) {
          throw new Error("Cannot resolve at phase boundary. Market may need manual resolution.");
        }

        // Construct previous round ID in the same phase
        const prevRoundId = constructRoundId(phase, aggregatorRound - 1);

        try {
          const prev: any = await pc.readContract({
            address: oracleAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: 'getRoundData',
            args: [prevRoundId],
          });

          const prevUpdatedAt = prev[3];
          if (prevUpdatedAt < expiry) {
            found = true;
            break; // targetRoundId is the first one after expiry
          }
          targetRoundId = prevRoundId;
        } catch (error: any) {
          // If previous round doesn't exist, we might be at phase boundary
          // Try to check if we can go to previous phase
          if (phase > 0) {
            // Try to get the last round of previous phase (this is complex, so we'll error)
            throw new Error(`Cannot find previous round. Market may be at phase boundary or too old. Error: ${error.message}`);
          }
          throw new Error(`Cannot find previous round data. Error: ${error.message}`);
        }
      }

      if (!found) throw new Error("Could not find the exact transition round within 50 updates. Market might be too old.");

      // 3. Resolve with the found roundId
      pushToast({ title: 'Resolving Market', description: `Executing resolve with round ${targetRoundId.toString()}...`, type: 'info' });

      const hash = await resolveMarketAsync({
        address: currentResolver as `0x${string}`,
        abi: getChainlinkResolverAbi(getNetwork()),
        functionName: 'resolve',
        args: [BigInt(marketId), targetRoundId],
      });

      if (hash && pc) {
        try {
          const receipt = await pc.waitForTransactionReceipt({ hash });

          // Check if transaction failed
          if (receipt.status === 'reverted') {
            throw new Error('Transaction reverted. Check the transaction on block explorer for details.');
          }

          pushToast({ title: 'Success', description: `Market #${marketId} resolved deterministically!`, type: 'success' });
          await loadResolvableMarkets();
        } catch (txError: any) {
          // If transaction failed, try to decode the error
          throw new Error(`Transaction failed: ${txError.message || 'Unknown error'}. Check block explorer for details.`);
        }
      }
    } catch (e: any) {
      console.error('Error resolving market:', e);

      // Try to extract more detailed error information
      let errorMessage = e.message || 'Failed to resolve market';

      // Try to decode error from transaction if available
      if (e.data || e.cause?.data) {
        try {
          const errorData = e.data || e.cause?.data;
          if (errorData && pc) {
            const decoded = decodeErrorResult({
              abi: getChainlinkResolverAbi(getNetwork()),
              data: errorData,
            });
            errorMessage = `Contract Error: ${decoded.errorName}`;

            // Map specific errors to user-friendly messages
            const errorMap: Record<string, string> = {
              'PhaseBoundaryRound': 'Cannot resolve at phase boundary. The market may need manual resolution.',
              'MarketNotExpired': 'Market has not expired yet.',
              'NotFirstRoundAfterExpiry': 'Selected round is not the first round after expiry.',
              'Stale': 'Round data is too stale (older than 2 hours).',
              'IncompleteRound': 'Round data is incomplete or previous round is missing.',
              'OracleDecimalsMismatch': 'Oracle decimals have changed since market creation.',
              'RoundTooEarly': 'Selected round occurred before market expiry.',
              'InvalidRoundId': 'Invalid round ID provided.',
              'NotChainlinkMarket': 'Market does not use Chainlink oracle.',
              'FeedMissing': 'Oracle feed address is not set.',
            };

            if (errorMap[decoded.errorName]) {
              errorMessage = errorMap[decoded.errorName];
            }
          }
        } catch (decodeError) {
          // If decoding fails, use original error message
          console.error('Failed to decode error:', decodeError);
        }
      }

      // Check for common error patterns in message
      if (errorMessage.includes('PhaseBoundaryRound') || errorMessage.includes('phase boundary')) {
        errorMessage = 'Cannot resolve at phase boundary. The market may need manual resolution.';
      } else if (errorMessage.includes('MarketNotExpired')) {
        errorMessage = 'Market has not expired yet.';
      } else if (errorMessage.includes('NotFirstRoundAfterExpiry')) {
        errorMessage = 'Selected round is not the first round after expiry.';
      } else if (errorMessage.includes('Stale')) {
        errorMessage = 'Round data is too stale (older than 2 hours).';
      } else if (errorMessage.includes('IncompleteRound')) {
        errorMessage = 'Round data is incomplete or previous round is missing.';
      } else if (errorMessage.includes('OracleDecimalsMismatch')) {
        errorMessage = 'Oracle decimals have changed since market creation.';
      } else if (errorMessage.includes('PAUSED') || errorMessage.includes('paused')) {
        errorMessage = 'Resolver contract is paused.';
      } else if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. Check the transaction on block explorer for the specific error reason.';
      }

      pushToast({ title: 'Error', description: errorMessage, type: 'error' });
    } finally {
      setResolvingMarketId(null);
    }
  };

  const handleAdd = async () => {
    if (!newAdminAddress || !publicClient) return;
    try {
      const addresses = getAddresses();

      // Grant DEFAULT_ADMIN_ROLE
      pushToast({ title: 'Granting Admin Role', description: 'Please confirm the transaction...', type: 'info' });
      const adminHash = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });

      if (adminHash) {
        await publicClient.waitForTransactionReceipt({ hash: adminHash });
        pushToast({ title: 'Admin Role Granted', description: 'Now granting market creator role...', type: 'success' });
      }

      // Grant MARKET_CREATOR_ROLE
      const creatorHash = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });

      if (creatorHash) {
        await publicClient.waitForTransactionReceipt({ hash: creatorHash });
        pushToast({ title: 'Success', description: 'Admin and market creator roles granted successfully!', type: 'success' });
        setNewAdminAddress(''); // Clear the input
        await loadCurrentAdmins(); // Refresh admin list
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to grant roles', type: 'error' });
    }
  };

  const handleRevoke = async () => {
    if (!revokeAdminAddress || !publicClient) return;

    try {
      const addresses = getAddresses();

      pushToast({ title: 'Revoking Admin Role', description: 'Please confirm the transaction...', type: 'info' });

      // Revoke DEFAULT_ADMIN_ROLE
      const adminHash = await revokeAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, revokeAdminAddress as `0x${string}`],
      });

      if (adminHash) {
        await publicClient.waitForTransactionReceipt({ hash: adminHash });
        pushToast({ title: 'Revoking Market Creator Role', description: 'Removing market creator role...', type: 'info' });
      }

      // Revoke MARKET_CREATOR_ROLE
      const creatorHash = await revokeAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, revokeAdminAddress as `0x${string}`],
      });

      if (creatorHash) {
        await publicClient.waitForTransactionReceipt({ hash: creatorHash });
      }

      // Revoke Treasury roles (if Treasury configured)
      if (addresses.treasury) {
        pushToast({ title: 'Revoking Treasury Roles', description: 'Removing treasury permissions...', type: 'info' });

        const h1 = await treasuryRevokeRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'revokeRole',
          args: [TREASURY_WITHDRAWER_ROLE, revokeAdminAddress as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h1 });

        const h2 = await treasuryRevokeRoleAsync({
          address: addresses.treasury,
          abi: treasuryAbi,
          functionName: 'revokeRole',
          args: [TREASURY_ADMIN_ROLE, revokeAdminAddress as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: h2 });
      }

      pushToast({ title: 'Success', description: 'Admin roles revoked successfully!', type: 'success' });
      setRevokeAdminAddress('');
      await loadCurrentAdmins(); // Refresh admin list
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to revoke roles', type: 'error' });
    }
  };

  const handleTransfer = async () => {
    if (!transferFromAddress || !transferToAddress || !publicClient) return;

    if (transferFromAddress.toLowerCase() === transferToAddress.toLowerCase()) {
      pushToast({ title: 'Error', description: 'From and To addresses must be different', type: 'error' });
      return;
    }

    try {
      const addresses = getAddresses();

      pushToast({ title: 'Transferring Admin', description: 'Granting roles to new admin...', type: 'info' });

      // Step 1: Grant roles to new admin
      const grantAdminHash = await transferAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, transferToAddress as `0x${string}`],
      });

      if (grantAdminHash) {
        await publicClient.waitForTransactionReceipt({ hash: grantAdminHash });
      }

      const grantCreatorHash = await transferAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, transferToAddress as `0x${string}`],
      });

      if (grantCreatorHash) {
        await publicClient.waitForTransactionReceipt({ hash: grantCreatorHash });
        pushToast({ title: 'Revoking Old Admin', description: 'Removing roles from old admin...', type: 'info' });
      }

      // Step 2: Revoke roles from old admin
      const revokeAdminHash = await transferAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, transferFromAddress as `0x${string}`],
      });

      if (revokeAdminHash) {
        await publicClient.waitForTransactionReceipt({ hash: revokeAdminHash });
      }

      const revokeCreatorHash = await transferAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'revokeRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, transferFromAddress as `0x${string}`],
      });

      if (revokeCreatorHash) {
        await publicClient.waitForTransactionReceipt({ hash: revokeCreatorHash });
        pushToast({ title: 'Success', description: 'Admin transferred successfully!', type: 'success' });
        setTransferFromAddress('');
        setTransferToAddress('');
        await loadCurrentAdmins(); // Refresh admin list
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to transfer admin', type: 'error' });
    }
  };

  const handleSetChainlinkResolver = async () => {
    if (!chainlinkResolverAddress || !publicClient) return;

    try {
      setIsCheckingResolver(true);
      const addresses = getAddresses();
      const network = getNetwork();

      if (network === 'testnet') {
        const minTimelockDelay = await publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'minTimelockDelay',
          args: [],
        }) as bigint;

        if (minTimelockDelay === 0n) {
          const OP_SET_RESOLVER = keccak256(stringToBytes('OP_SET_RESOLVER'));
          const resolverAddr = chainlinkResolverAddress as `0x${string}`;

          pushToast({ title: 'Scheduling Resolver', description: 'Scheduling resolver registration...', type: 'info' });

          const { encodeAbiParameters } = await import('viem');
          const encodedData = encodeAbiParameters(
            [{ type: 'address' }],
            [chainlinkResolverAddress as `0x${string}`]
          );

          const opId = await setChainlinkResolverAsync({
            address: addresses.core,
            abi: getCoreAbi(getCurrentNetwork()),
            functionName: 'scheduleOp',
            args: [OP_SET_RESOLVER, encodedData],
          });

          if (opId) {
            await publicClient.waitForTransactionReceipt({ hash: opId });
            pushToast({ title: 'Executing Resolver', description: 'Executing resolver registration...', type: 'info' });

            const executeHash = await setChainlinkResolverAsync({
              address: addresses.core,
              abi: getCoreAbi(getCurrentNetwork()),
              functionName: 'executeSetResolver',
              args: [opId, resolverAddr],
            });

            if (executeHash) {
              await publicClient.waitForTransactionReceipt({ hash: executeHash });
              pushToast({ title: 'Success', description: 'Chainlink resolver registered successfully', type: 'success' });
              refetchResolver();
            }
          }
        } else {
          pushToast({
            title: 'Timelock Required',
            description: `Testnet has a ${Number(minTimelockDelay)}s timelock. Please use contracts/script/ExecuteAfterDelay.s.sol after the delay.`,
            type: 'error',
          });
        }
      } else {
        const hash = await setChainlinkResolverAsync({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'setChainlinkResolver',
          args: [chainlinkResolverAddress as `0x${string}`],
        });
        if (hash) {
          pushToast({ title: 'Success', description: 'Chainlink resolver registration submitted', type: 'success' });
          refetchResolver();
        }
      }
    } catch (e: any) {
      console.error('Error setting resolver:', e);
      pushToast({ title: 'Error', description: e.message || 'Failed to set Chainlink resolver', type: 'error' });
    } finally {
      setIsCheckingResolver(false);
    }
  };

  const handleRegisterFeed = async (feedId?: string, feedAddr?: string) => {
    const feed = feedId || selectedFeed;
    const addr = feedAddr || feedAddress;

    if (!feed || !addr) {
      pushToast({ title: 'Error', description: 'Please select a feed and provide an address', type: 'error' });
      return;
    }

    try {
      const addresses = getAddresses();
      const feedIdHash = keccak256(stringToBytes(feed));

      pushToast({ title: 'Registering Feed', description: `Registering ${feed}...`, type: 'info' });

      const hash = await setGlobalFeedAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'setGlobalFeed',
        args: [feedIdHash, addr as `0x${string}`],
      });

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `${feed} feed registered successfully!`, type: 'success' });
        setSelectedFeed('');
        setFeedAddress('');
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to register feed', type: 'error' });
    }
  };

  // Confirmation wrapper functions for dangerous operations
  const confirmGrantAdmin = () => {
    if (!validAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Grant Admin Role',
      description: 'You are about to grant full admin privileges to this address. This gives them complete control over the protocol including role management, upgrades, and settings.',
      type: 'warning',
      addressDisplay: newAdminAddress,
      roleInfo: 'DEFAULT_ADMIN_ROLE + MARKET_CREATOR_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleAdd();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmRevokeAdmin = () => {
    if (!validRevokeAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Admin Role',
      description: 'You are about to revoke all admin privileges from this address. This action removes their ability to manage the protocol.',
      type: 'danger',
      addressDisplay: revokeAdminAddress,
      roleInfo: 'DEFAULT_ADMIN_ROLE + MARKET_CREATOR_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleRevoke();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmTransferAdmin = () => {
    if (!validTransferFromAddress || !validTransferToAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Transfer Admin Role',
      description: `You are about to transfer admin privileges. Roles will be granted to the new address and revoked from the old address.`,
      type: 'danger',
      addressDisplay: `From: ${transferFromAddress.slice(0, 10)}... → To: ${transferToAddress.slice(0, 10)}...`,
      roleInfo: 'DEFAULT_ADMIN_ROLE + MARKET_CREATOR_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleTransfer();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmGrantTreasuryRoles = () => {
    if (!validTreasuryRoleAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Grant Treasury Roles',
      description: 'You are about to grant treasury withdrawal and admin privileges. This allows the address to withdraw funds from the Treasury.',
      type: 'warning',
      addressDisplay: treasuryRoleAddress,
      roleInfo: 'WITHDRAWER_ROLE + ADMIN_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleGrantTreasuryRoles();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmRevokeTreasuryRoles = () => {
    if (!validTreasuryRoleAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Treasury Roles',
      description: 'You are about to remove treasury privileges from this address. They will no longer be able to withdraw funds.',
      type: 'danger',
      addressDisplay: treasuryRoleAddress,
      roleInfo: 'WITHDRAWER_ROLE + ADMIN_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleRevokeTreasuryRoles();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmGrantAllPermissions = () => {
    if (!validPermissionsAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Grant All Permissions',
      description: 'You are about to grant ALL core and treasury roles to this address.',
      type: 'warning',
      addressDisplay: permissionsAddress,
      roleInfo: 'DEFAULT_ADMIN_ROLE + MARKET_CREATOR_ROLE + WITHDRAWER_ROLE + ADMIN_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleGrantAllPermissions();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const confirmRevokeAllPermissions = () => {
    if (!validPermissionsAddress) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke All Permissions',
      description: 'You are about to revoke ALL core and treasury roles from this address.',
      type: 'danger',
      addressDisplay: permissionsAddress,
      roleInfo: 'DEFAULT_ADMIN_ROLE + MARKET_CREATOR_ROLE + WITHDRAWER_ROLE + ADMIN_ROLE',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await handleRevokeAllPermissions();
        } finally {
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };


  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" aria-hidden="true" />
        <span className="ml-3 text-sm font-medium text-gray-500" role="status">Checking admin access...</span>
      </motion.div>
    );
  }

  if (!isAdmin) return null;

  // If user only has MARKET_CREATOR_ROLE but not DEFAULT_ADMIN_ROLE, show restricted message
  if (!hasDefaultAdminRole) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                Limited Access
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-300 mb-3">
                You have <span className="font-mono font-bold">MARKET_CREATOR_ROLE</span> which allows you to create markets, but you need <span className="font-mono font-bold">DEFAULT_ADMIN_ROLE</span> to manage admin permissions.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Only full admins can grant or revoke roles. Contact a DEFAULT_ADMIN to upgrade your permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Current Admins List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Current Admins ({currentAdmins.length})
          </label>
          <Button
            onClick={loadCurrentAdmins}
            disabled={loadingAdmins}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingAdmins ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>

        {currentAdmins.length === 0 ? (
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center text-xs text-gray-500 dark:text-gray-400">
            No admins found or loading...
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {currentAdmins.map((admin, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="font-mono text-sm text-gray-900 dark:text-white">{admin.slice(0, 6)}...{admin.slice(-4)}</span>
                  {admin.toLowerCase() === address?.toLowerCase() && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-bold">
                      You
                    </span>
                  )}
                </div>
                <a
                  href={`https://${getCurrentNetwork() === 'testnet' ? 'testnet.' : ''}bscscan.com/address/${admin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Core: Market Ops Only (MARKET_CREATOR_ROLE) */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Market Ops Role (No Money)
          </label>
          <Button
            onClick={() => refreshCoreMarketCreatorRole()}
            disabled={!validMarketCreatorAddress || loadingCoreCreatorRole}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingCoreCreatorRole ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
            Check
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          This grants <span className="font-bold">only</span> <span className="font-mono">MARKET_CREATOR_ROLE</span> (create markets). It does not grant admin powers and does not touch Treasury.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={marketCreatorAddress}
              onChange={(e) => setMarketCreatorAddress(e.target.value)}
              placeholder="0x... (ops wallet)"
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-blue-500"
              aria-label="Ops wallet address for MARKET_CREATOR_ROLE"
            />
            <AnimatePresence>
              {validMarketCreatorAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleGrantMarketCreatorRole}
            disabled={!validMarketCreatorAddress}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[110px]"
          >
            Grant
          </Button>
          <Button
            onClick={handleRevokeMarketCreatorRole}
            disabled={!validMarketCreatorAddress}
            className="bg-red-600 hover:bg-red-700 text-white min-w-[110px]"
          >
            Revoke
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
            MARKET_CREATOR_ROLE status
          </div>
          <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            {coreHasMarketCreator === null ? '—' : coreHasMarketCreator ? '✅ Granted' : '❌ Not granted'}
          </div>
        </div>

        {!validMarketCreatorAddress && marketCreatorAddress.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
      </div>

      {/* Treasury Roles (Money-only) */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Treasury Roles (Money Only)
          </label>
          <Button
            onClick={() => refreshTreasuryRoles()}
            disabled={!validTreasuryRoleAddress || loadingTreasuryRoles}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingTreasuryRoles ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
            Check
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          Give your Safe multisig these roles so <span className="font-bold">only the Safe</span> can withdraw from Treasury.
          This does <span className="font-bold">not</span> affect market creation.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={treasuryRoleAddress}
              onChange={(e) => setTreasuryRoleAddress(e.target.value)}
              placeholder="0x... (Safe multisig address)"
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-emerald-500"
              aria-label="Safe multisig address for Treasury roles"
            />
            <AnimatePresence>
              {validTreasuryRoleAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={confirmGrantTreasuryRoles}
            disabled={!validTreasuryRoleAddress}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
          >
            Grant
          </Button>
          <Button
            onClick={confirmRevokeTreasuryRoles}
            disabled={!validTreasuryRoleAddress}
            className="bg-red-600 hover:bg-red-700 text-white min-w-[110px]"
          >
            Revoke
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              WITHDRAWER_ROLE (daily capped withdrawals)
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {treasuryHasWithdrawer === null ? '—' : treasuryHasWithdrawer ? '✅ Granted' : '❌ Not granted'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              ADMIN_ROLE (schedule/execute large withdraws)
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {treasuryHasAdmin === null ? '—' : treasuryHasAdmin ? '✅ Granted' : '❌ Not granted'}
            </div>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Large withdrawals are timelocked by the contract (24h).
            </div>
          </div>
        </div>

        {!validTreasuryRoleAddress && treasuryRoleAddress.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
      </div>

      {/* Admin Permissions (All Roles) */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Admin Permissions (All Roles)
          </label>
          <Button
            onClick={() => refreshPermissions()}
            disabled={!validPermissionsAddress || loadingPermissions}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingPermissions ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
            Check
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          Manage all core + treasury permissions for a single address from one place.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={permissionsAddress}
              onChange={(e) => setPermissionsAddress(e.target.value)}
              placeholder="0x... (address to manage)"
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-blue-500"
              aria-label="Address to manage permissions"
            />
            <AnimatePresence>
              {validPermissionsAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={confirmGrantAllPermissions}
            disabled={!validPermissionsAddress}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
          >
            Grant All
          </Button>
          <Button
            onClick={confirmRevokeAllPermissions}
            disabled={!validPermissionsAddress}
            className="bg-red-600 hover:bg-red-700 text-white min-w-[110px]"
          >
            Revoke All
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              CORE: DEFAULT_ADMIN_ROLE
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {permCoreAdmin === null ? '—' : permCoreAdmin ? '✅ Granted' : '❌ Not granted'}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  try {
                    const h = await addAdminAsync({
                      address: addresses.core,
                      abi: getCoreAbi(getCurrentNetwork()),
                      functionName: 'grantRole',
                      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to grant DEFAULT_ADMIN_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Grant
              </Button>
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  try {
                    const h = await revokeAdminAsync({
                      address: addresses.core,
                      abi: getCoreAbi(getCurrentNetwork()),
                      functionName: 'revokeRole',
                      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to revoke DEFAULT_ADMIN_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Revoke
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              CORE: MARKET_CREATOR_ROLE
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {permMarketCreator === null ? '—' : permMarketCreator ? '✅ Granted' : '❌ Not granted'}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  try {
                    const h = await addAdminAsync({
                      address: addresses.core,
                      abi: getCoreAbi(getCurrentNetwork()),
                      functionName: 'grantRole',
                      args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to grant MARKET_CREATOR_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Grant
              </Button>
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  try {
                    const h = await revokeAdminAsync({
                      address: addresses.core,
                      abi: getCoreAbi(getCurrentNetwork()),
                      functionName: 'revokeRole',
                      args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to revoke MARKET_CREATOR_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Revoke
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              TREASURY: WITHDRAWER_ROLE
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {permTreasuryWithdrawer === null ? '—' : permTreasuryWithdrawer ? '✅ Granted' : '❌ Not granted'}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  if (!addresses.treasury) return;
                  try {
                    const h = await treasuryGrantRoleAsync({
                      address: addresses.treasury,
                      abi: treasuryAbi,
                      functionName: 'grantRole',
                      args: [TREASURY_WITHDRAWER_ROLE, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to grant WITHDRAWER_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Grant
              </Button>
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  if (!addresses.treasury) return;
                  try {
                    const h = await treasuryRevokeRoleAsync({
                      address: addresses.treasury,
                      abi: treasuryAbi,
                      functionName: 'revokeRole',
                      args: [TREASURY_WITHDRAWER_ROLE, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to revoke WITHDRAWER_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Revoke
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-900/30 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              TREASURY: ADMIN_ROLE
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {permTreasuryAdmin === null ? '—' : permTreasuryAdmin ? '✅ Granted' : '❌ Not granted'}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  if (!addresses.treasury) return;
                  try {
                    const h = await treasuryGrantRoleAsync({
                      address: addresses.treasury,
                      abi: treasuryAbi,
                      functionName: 'grantRole',
                      args: [TREASURY_ADMIN_ROLE, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to grant ADMIN_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Grant
              </Button>
              <Button
                onClick={async () => {
                  if (!publicClient || !validPermissionsAddress) return;
                  const addr = permissionsAddress.trim();
                  const addresses = getAddresses();
                  if (!addresses.treasury) return;
                  try {
                    const h = await treasuryRevokeRoleAsync({
                      address: addresses.treasury,
                      abi: treasuryAbi,
                      functionName: 'revokeRole',
                      args: [TREASURY_ADMIN_ROLE, addr as `0x${string}`],
                    });
                    await publicClient.waitForTransactionReceipt({ hash: h });
                    await refreshPermissions(addr);
                  } catch (e: any) {
                    pushToast({ title: 'Error', description: e?.message || 'Failed to revoke ADMIN_ROLE', type: 'error' });
                  }
                }}
                disabled={!validPermissionsAddress}
                className="h-8 bg-red-600 hover:bg-red-700 text-white"
              >
                Revoke
              </Button>
            </div>
          </div>
        </div>

        {!validPermissionsAddress && permissionsAddress.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
      </div>

      {/* 1. Grant Admin Role */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <label htmlFor="admin-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">Grant Admin Role</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="admin-address"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-purple-500"
              aria-label="New admin Ethereum address"
            />
            <AnimatePresence>
              {validAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button onClick={confirmGrantAdmin} disabled={!validAddress} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[100px]">
            <UserPlus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
        {newAdminAddress.length > 0 && !validAddress && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
      </div>

      {/* Revoke Admin Role */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <label htmlFor="revoke-admin-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
          Revoke Admin Role
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="revoke-admin-address"
              value={revokeAdminAddress}
              onChange={(e) => setRevokeAdminAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-red-500"
              aria-label="Admin address to revoke"
            />
            <AnimatePresence>
              {validRevokeAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={confirmRevokeAdmin}
            disabled={!validRevokeAddress}
            className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]"
          >
            <X className="w-4 h-4 mr-2" /> Revoke
          </Button>
        </div>
        {revokeAdminAddress.length > 0 && !validRevokeAddress && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-400 ml-1 mt-1">
          ⚠️ Warning: This will remove all admin permissions from the address
        </p>
      </div>

      {/* Transfer Admin */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
          Transfer Admin (Replace Admin)
        </label>
        <div className="space-y-3">
          <div className="relative">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From (Current Admin)</label>
            <Input
              value={transferFromAddress}
              onChange={(e) => setTransferFromAddress(e.target.value)}
              placeholder="0x... (current admin)"
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-orange-500"
            />
            <AnimatePresence>
              {validTransferFromAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-8 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">To (New Admin)</label>
            <Input
              value={transferToAddress}
              onChange={(e) => setTransferToAddress(e.target.value)}
              placeholder="0x... (new admin)"
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-emerald-500"
            />
            <AnimatePresence>
              {validTransferToAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-8 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={confirmTransferAdmin}
            disabled={!validTransferFromAddress || !validTransferToAddress || transferFromAddress.toLowerCase() === transferToAddress.toLowerCase()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Zap className="w-4 h-4 mr-2" /> Transfer Admin
          </Button>
        </div>
        {(transferFromAddress.length > 0 && !validTransferFromAddress) && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid "From" address format</p>
        )}
        {(transferToAddress.length > 0 && !validTransferToAddress) && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid "To" address format</p>
        )}
        {validTransferFromAddress && validTransferToAddress && transferFromAddress.toLowerCase() === transferToAddress.toLowerCase() && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">From and To addresses must be different</p>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-400 ml-1 mt-1">
          ⚠️ This will grant admin to the new address and revoke it from the old address
        </p>
      </div>

      {/* 2. Chainlink Resolver */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <label htmlFor="resolver-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
          Chainlink Resolver
          {currentResolver && currentResolver !== '0x0000000000000000000000000000000000000000' && (
            <span className="ml-2 text-green-600 dark:text-green-400 text-[10px] normal-case font-mono">
              (Current: {currentResolver.slice(0, 6)}...{currentResolver.slice(-4)})
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="resolver-address"
              value={chainlinkResolverAddress}
              onChange={(e) => setChainlinkResolverAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-blue-500"
            />
            <AnimatePresence>
              {validResolverAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleSetChainlinkResolver}
            disabled={!validResolverAddress || isCheckingResolver}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
          >
            {isCheckingResolver ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
            Set
          </Button>
        </div>
      </div>

      {/* 3. Manual Resolution */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Manual Resolution (Expired)
          </label>
          <Button
            onClick={loadResolvableMarkets}
            disabled={loadingMarkets || !currentResolver || currentResolver === '0x0000000000000000000000000000000000000000'}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingMarkets ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>

        {!currentResolver || currentResolver === '0x0000000000000000000000000000000000000000' ? (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
            Resolver not registered.
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No expired markets found.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {markets.map((market) => {
              const isResolving = resolvingMarketId === market.id;
              return (
                <div key={market.id} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 rounded-lg p-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{market.id}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate max-w-[200px]">{market.question}</span>
                    </div>
                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-1">
                      Expired: {new Date(Number(market.expiryTimestamp) * 1000).toLocaleString('en-US')}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleResolveMarket(market.id)}
                    disabled={isResolving}
                    size="sm"
                    className="bg-[#14B8A6] hover:bg-[#0D9488] text-white shrink-0 h-8 text-xs"
                  >
                    {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        type={confirmDialog.type}
        addressDisplay={confirmDialog.addressDisplay}
        roleInfo={confirmDialog.roleInfo}
        isLoading={confirmLoading}
        confirmText="Proceed"
        cancelText="Cancel"
      />

    </div>
  );
}