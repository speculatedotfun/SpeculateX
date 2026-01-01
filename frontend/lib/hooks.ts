import { readContract, getPublicClient } from 'wagmi/actions';
import { config } from './wagmi';
import { getAddresses, getChainId, getCurrentNetwork, MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from './contracts';
import { formatUnits, keccak256, stringToBytes, parseAbiItem } from 'viem';
import { getCoreAbi } from './abis';
import { MarketInfo, MarketState, MarketResolution } from './types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

const questionCache = new Map<string, string>();

function cacheKey(core: string, chainId: number, marketId: bigint) {
  return `${chainId}:${core.toLowerCase()}:${marketId.toString()}`;
}

function isNoFacetError(err: any) {
  const msg = (err?.shortMessage || err?.message || '').toString();
  return msg.includes('NO_FACET') || msg.includes('no facet') || msg.includes('NO_FACET');
}

async function getQuestionFromMarketCreatedEvent(marketId: bigint): Promise<string | null> {
  const addresses = getAddresses();
  const chainId = getChainId();
  const key = cacheKey(addresses.core, chainId, marketId);

  if (questionCache.has(key)) return questionCache.get(key)!;
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem(`marketQuestion:${key}`);
    if (ls) {
      questionCache.set(key, ls);
      return ls;
    }
  }

  const publicClient = getClientForCurrentNetwork();
  const currentBlock = await publicClient.getBlockNumber();

  // Scan backwards in small chunks to avoid RPC limits
  const CHUNK_SIZE = 2000n;
  const MAX_BACKLOOK = 1_000_000n;
  const startBlock = currentBlock > MAX_BACKLOOK ? currentBlock - MAX_BACKLOOK : 0n;

  const event = parseAbiItem(
    'event MarketCreated(uint256 indexed id, address yes, address no, bytes32 questionHash, string question, uint256 initUsdc, uint256 expiryTimestamp)'
  );

  for (let to = currentBlock; to > startBlock; to -= CHUNK_SIZE) {
    const from = to - CHUNK_SIZE < startBlock ? startBlock : to - CHUNK_SIZE;
    try {
      const logs = await publicClient.getLogs({
        address: addresses.core,
        event,
        args: { id: marketId },
        fromBlock: from,
        toBlock: to,
      });

      if (logs && logs.length > 0) {
        const log = logs[0] as { args: { question?: string } };
        const q = log.args?.question ?? '';
        const trimmed = (q || '').trim();
        if (trimmed) {
          questionCache.set(key, trimmed);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(`marketQuestion:${key}`, trimmed); } catch { }
          }
          return trimmed;
        }
      }
    } catch (e) {
      console.warn(`[getMarketQuestion] RPC error at range ${from}-${to}, continuing...`, e);
    }
  }

  return null;
}

// Helper to get public client for current network
function getClientForCurrentNetwork() {
  const chainId = getChainId();
  return getPublicClient(config, { chainId: chainId as 56 | 97 });
}

// Get market count
export async function getMarketCount(): Promise<bigint> {
  const addresses = getAddresses();
  const chainId = getChainId();
  try {
    const publicClient = getClientForCurrentNetwork();
    const result = await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'marketCount',
      args: [],
    });
    return result as bigint;
  } catch (error: any) {
    console.error(`[getMarketCount] Error reading contract on chain ${chainId}:`, error);
    // If contract doesn't exist on this chain, return 0
    if (error?.message?.includes('no data') || error?.message?.includes('not a contract')) {
      console.warn(`[getMarketCount] Contract ${addresses.core} may not exist on chain ${chainId}`);
      return 0n;
    }
    throw error;
  }
}

// Get single market
export async function getMarket(id: bigint) {
  try {
    const addresses = getAddresses();
    const publicClient = getClientForCurrentNetwork();
    const result = await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'markets',
      args: [id],
    }) as Record<string, any> | any[];

    const isObject = !!result && typeof result === 'object' && !Array.isArray(result) && 'yes' in result;

    const yes = (isObject ? result.yes : result?.[0]) as `0x${string}` | undefined;
    const no = (isObject ? result.no : result?.[1]) as `0x${string}` | undefined;
    const qYes = BigInt(isObject ? result.qYes ?? 0n : result?.[2] ?? 0n);
    const qNo = BigInt(isObject ? result.qNo ?? 0n : result?.[3] ?? 0n);
    const bE18 = BigInt(isObject ? result.bE18 ?? 0n : result?.[4] ?? 0n);
    const usdcVault = BigInt(isObject ? result.usdcVault ?? 0n : result?.[5] ?? 0n);
    const feeTreasuryBps = Number(isObject ? (result.feeTreasuryBps ?? 0) : (result?.[6] ?? 0));
    const feeLpBps = Number(isObject ? (result.feeLpBps ?? 0) : (result?.[7] ?? 0));
    const feeVaultBps = Number(isObject ? (result.feeVaultBps ?? 0) : (result?.[8] ?? 0));
    const status = Number(isObject ? (result.status ?? 0) : (result?.[9] ?? 0));

    // Updated struct layout: questionHash (index 10), question (index 11), creator (index 12)
    // Note: string is a dynamic type, so we read it via a separate getter function
    const questionHash = (isObject ? (result.questionHash ?? ZERO_BYTES32) : (result?.[10] ?? ZERO_BYTES32)) as `0x${string}`;
    const creator = (isObject ? (result.creator ?? ZERO_ADDRESS) : (result?.[12] ?? ZERO_ADDRESS)) as `0x${string}`;

    // Read question via separate getter (string is dynamic type, not in tuple)
    let question = '';
    try {
      const questionResult = await publicClient.readContract({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'getMarketQuestion',
        args: [id],
      });
      question = (questionResult as string) || '';
    } catch (e) {
      // If getter doesn't exist (old contract), question will be empty and we'll fallback to events
      console.warn(`[getMarket] getMarketQuestion not available for market ${id}, will try event fallback`);
    }

    const totalLpUsdc = BigInt(isObject ? (result.totalLpUsdc ?? 0n) : (result?.[13] ?? 0n));
    const lpFeesUSDC = BigInt(isObject ? (result.lpFeesUSDC ?? 0n) : (result?.[14] ?? 0n));
    const residualUSDC = BigInt(isObject ? (result.residualUSDC ?? 0n) : (result?.[15] ?? 0n));

    // Read resolution via dedicated getter function (more reliable than parsing nested struct from markets mapping)
    // This avoids struct field misalignment issues when reading nested structs from the Diamond contract
    let resolution: any;
    try {
      const resolutionResult = await publicClient.readContract({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'getMarketResolution',
        args: [id],
      }) as Record<string, any> | any[];

      // Handle both object and tuple formats
      // Struct: { startTime, expiryTimestamp, oracleType, oracleAddress, priceFeedId, targetValue, comparison, yesWins, isResolved, oracleDecimals }
      const isResolutionObject = !!resolutionResult && typeof resolutionResult === 'object' && !Array.isArray(resolutionResult) && 'expiryTimestamp' in resolutionResult;

      resolution = {
        startTime: BigInt(isResolutionObject ? (resolutionResult.startTime ?? 0n) : (resolutionResult?.[0] ?? 0n)),
        expiryTimestamp: BigInt(isResolutionObject ? (resolutionResult.expiryTimestamp ?? 0n) : (resolutionResult?.[1] ?? 0n)),
        oracleType: Number(isResolutionObject ? (resolutionResult.oracleType ?? 0) : (resolutionResult?.[2] ?? 0)),
        oracleAddress: (isResolutionObject ? (resolutionResult.oracleAddress ?? ZERO_ADDRESS) : (resolutionResult?.[3] ?? ZERO_ADDRESS)) as `0x${string}`,
        priceFeedId: (isResolutionObject ? (resolutionResult.priceFeedId ?? ZERO_BYTES32) : (resolutionResult?.[4] ?? ZERO_BYTES32)) as `0x${string}`,
        targetValue: BigInt(isResolutionObject ? (resolutionResult.targetValue ?? 0n) : (resolutionResult?.[5] ?? 0n)),
        comparison: Number(isResolutionObject ? (resolutionResult.comparison ?? 0) : (resolutionResult?.[6] ?? 0)),
        yesWins: Boolean(isResolutionObject ? (resolutionResult.yesWins ?? false) : (resolutionResult?.[7] ?? false)),
        isResolved: Boolean(isResolutionObject ? (resolutionResult.isResolved ?? false) : (resolutionResult?.[8] ?? false)),
        oracleDecimals: Number(isResolutionObject ? (resolutionResult.oracleDecimals ?? 0) : (resolutionResult?.[9] ?? 0)),
      };
    } catch (e) {
      // Fallback: try to read from markets struct (for old contracts that don't have getMarketResolution)
      console.warn(`[getMarket] getMarketResolution failed for market ${id}, falling back to struct parsing:`, e);
      const resolutionRaw = isObject
        ? result.resolution
        : (Array.isArray(result) ? (result?.[18] ?? result?.[17] ?? result?.[16] ?? result?.[12]) : undefined);

      resolution = {
        startTime: BigInt(resolutionRaw?.startTime ?? resolutionRaw?.[0] ?? 0n),
        expiryTimestamp: BigInt(resolutionRaw?.expiryTimestamp ?? resolutionRaw?.[1] ?? 0n),
        oracleType: Number(resolutionRaw?.oracleType ?? resolutionRaw?.[2] ?? 0),
        oracleAddress: (resolutionRaw?.oracleAddress ?? resolutionRaw?.[3] ?? ZERO_ADDRESS) as `0x${string}`,
        priceFeedId: (resolutionRaw?.priceFeedId ?? resolutionRaw?.[4] ?? ZERO_BYTES32) as `0x${string}`,
        targetValue: BigInt(resolutionRaw?.targetValue ?? resolutionRaw?.[5] ?? 0n),
        comparison: Number(resolutionRaw?.comparison ?? resolutionRaw?.[6] ?? 0),
        yesWins: Boolean(resolutionRaw?.yesWins ?? resolutionRaw?.[7] ?? false),
        isResolved: Boolean(resolutionRaw?.isResolved ?? resolutionRaw?.[8] ?? false),
        oracleDecimals: Number(resolutionRaw?.oracleDecimals ?? resolutionRaw?.[9] ?? 0),
      };
    }

    const exists = !!yes && yes !== ZERO_ADDRESS;

    // Question is now stored on-chain, but fallback to event logs for backwards compatibility with old markets
    let questionFinal = question?.trim() || '';
    if (!questionFinal) {
      const recovered = await getQuestionFromMarketCreatedEvent(id);
      if (recovered) questionFinal = recovered;
    }

    return {
      yes: yes ?? ZERO_ADDRESS,
      no: no ?? ZERO_ADDRESS,
      qYes,
      qNo,
      usdcVault,
      bE18,
      feeTreasuryBps,
      feeVaultBps,
      feeLpBps,
      totalFeeBps: feeTreasuryBps + feeVaultBps + feeLpBps,
      status,
      question: questionFinal,
      questionHash,
      creator,
      resolution,
      totalLpUsdc,
      lpFeesUSDC,
      residualUSDC,
      exists,
    };
  } catch (error: any) {
    console.error('Error loading market:', error);
    // Return a minimal market object to prevent crashes
    return {
      yes: ZERO_ADDRESS,
      no: ZERO_ADDRESS,
      qYes: 0n,
      qNo: 0n,
      usdcVault: 0n,
      bE18: 0n,
      feeTreasuryBps: 0,
      feeVaultBps: 0,
      feeLpBps: 0,
      totalFeeBps: 0,
      status: 0,
      question: 'Market not found',
      lp: ZERO_ADDRESS,
      resolution: {
        expiryTimestamp: 0n,
        oracleType: 0,
        oracleAddress: ZERO_ADDRESS,
        priceFeedId: '0x0000000000000000000000000000000000000000000000000000000000000000',
        targetValue: 0n,
        comparison: 0,
        yesWins: false,
        isResolved: false,
      },
      totalLpUsdc: 0n,
      lpFeesUSDC: 0n,
      exists: false,
    };
  }
}

// Pricing helpers (contract exposes spot price in E6)
export async function getSpotPriceYesE6(marketId: bigint): Promise<bigint> {
  const addresses = getAddresses();
  const publicClient = getClientForCurrentNetwork();
  try {
    return await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'spotPriceYesE6',
      args: [marketId],
    }) as bigint;
  } catch (e: any) {
    if (isNoFacetError(e)) return 500000n; // neutral 50/50 until activated
    throw e;
  }
}

export async function getPriceYes(marketId: bigint): Promise<string> {
  const priceE6 = await getSpotPriceYesE6(marketId);
  return (Number(priceE6) / 1e6).toFixed(6);
}

export async function getPriceNo(marketId: bigint): Promise<string> {
  const priceYesE6 = await getSpotPriceYesE6(marketId);
  const priceNoE6 = 1_000_000n - (priceYesE6 > 1_000_000n ? 1_000_000n : priceYesE6);
  return (Number(priceNoE6) / 1e6).toFixed(6);
}

export async function getMarketState(id: bigint) {
  const addresses = getAddresses();
  const publicClient = getClientForCurrentNetwork();
  try {
    const raw = await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'getMarketState',
      args: [id],
    }) as any[];

    // Mainnet (old): [qYes,qNo,vault,b,priceYesE6]
    // Testnet (diamond): [qYes,qNo,vault,bE18,status,questionHash]
    const arr = Array.isArray(raw) ? raw : [raw];
    const qYes = BigInt(arr?.[0] ?? 0n);
    const qNo = BigInt(arr?.[1] ?? 0n);
    const vault = BigInt(arr?.[2] ?? 0n);
    const bE18 = BigInt(arr?.[3] ?? 0n);

    let status = 1; // Default to ACTIVE for legacy markets
    let questionHash = ZERO_BYTES32 as `0x${string}`;
    let priceYesE6: bigint;

    if (arr.length >= 6) {
      status = Number(arr?.[4] ?? 0);
      questionHash = (arr?.[5] ?? ZERO_BYTES32) as `0x${string}`;
      // diamond doesn't return price; read from trading facet
      priceYesE6 = await getSpotPriceYesE6(id);
    } else {
      priceYesE6 = BigInt(arr?.[4] ?? 0n);
    }

    return { qYes, qNo, vault, bE18, status, questionHash, priceYesE6 };
  } catch (error: any) {
    const e = error as Error & { shortMessage?: string };
    if (isNoFacetError(e)) {
      // router not activated yet (facets not wired)
      return { qYes: 0n, qNo: 0n, vault: 0n, bE18: 0n, status: 0, questionHash: ZERO_BYTES32 as `0x${string}`, priceYesE6: 500000n, notActivated: true };
    }
    throw e;
  }
}

// Get market resolution config
export async function getMarketResolution(id: bigint) {
  try {
    const addresses = getAddresses();
    const publicClient = getClientForCurrentNetwork();
    const result = await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'getMarketResolution',
      args: [id],
    }) as any;

    return {
      startTime: result.startTime || result[0] || 0n,
      expiryTimestamp: result.expiryTimestamp || result[1] || 0n,
      oracleType: result.oracleType !== undefined ? Number(result.oracleType) : (result[2] !== undefined ? Number(result[2]) : 0),
      oracleAddress: result.oracleAddress || result[3] || ZERO_ADDRESS,
      priceFeedId: result.priceFeedId || result[4] || '0x0000000000000000000000000000000000000000000000000000000000000000',
      targetValue: result.targetValue || result[5] || 0n,
      comparison: result.comparison !== undefined ? Number(result.comparison) : (result[6] !== undefined ? Number(result[6]) : 0),
      yesWins: result.yesWins !== undefined ? Boolean(result.yesWins) : (result[7] !== undefined ? Boolean(result[7]) : false),
      isResolved: result.isResolved !== undefined ? Boolean(result.isResolved) : (result[8] !== undefined ? Boolean(result[8]) : false),
    };
  } catch (error) {
    console.error('Error loading market resolution:', error);
    return {
      startTime: 0n,
      expiryTimestamp: 0n,
      oracleType: 0,
      oracleAddress: ZERO_ADDRESS,
      priceFeedId: '0x0000000000000000000000000000000000000000000000000000000000000000',
      targetValue: 0n,
      comparison: 0,
      yesWins: false,
      isResolved: false,
    };
  }
}

const adminRoleCache = new Map<string, boolean>();

// Check if an address is an admin (SpeculateCore uses AccessControl)
export async function isAdmin(address: `0x${string}`): Promise<boolean> {
  if (!address) return false;

  const normalized = address.toLowerCase();

  if (adminRoleCache.has(normalized)) {
    return adminRoleCache.get(normalized)!;
  }

  try {
    const addresses = getAddresses();
    const publicClient = getClientForCurrentNetwork();
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const hasAdminRole = await publicClient.readContract({
      address: addresses.core,
      abi: getCoreAbi(getCurrentNetwork()),
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    }) as boolean;

    if (hasAdminRole) {
      adminRoleCache.set(normalized, true);
      return true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('exceeds defined limit')) {
      console.error('Error checking admin status:', error);
    }
  }

  adminRoleCache.set(normalized, false);
  return false;
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

export async function getPendingLpFees(id: bigint, user: `0x${string}`) {
  if (!user || user === ZERO_ADDRESS) return 0n;
  const addresses = getAddresses();
  const publicClient = getClientForCurrentNetwork();
  return await publicClient.readContract({
    address: addresses.core,
    abi: getCoreAbi(getCurrentNetwork()),
    functionName: 'pendingLpFees',
    args: [id, user],
  }) as bigint;
}

export async function getInvariantUsdc(id: bigint) {
  const addresses = getAddresses();
  const publicClient = getClientForCurrentNetwork();
  return await publicClient.readContract({
    address: addresses.core,
    abi: getCoreAbi(getCurrentNetwork()),
    functionName: 'invariantUsdc',
    args: [id],
  }) as bigint;
}

export async function getLpResidualPot(id: bigint): Promise<bigint> {
  const market = await getMarket(id);
  return BigInt((market as Record<string, any>)?.residualUSDC ?? 0n);
}
