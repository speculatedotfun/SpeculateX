// ABI compatibility layer - handles both wrapped and unwrapped ABIs
import speculateCoreAbiData from './abis/SpeculateCore.json';
import speculateCoreRouterAbiData from './abis/SpeculateCoreRouter.json';
import marketFacetAbiData from './abis/MarketFacet.json';
import tradingFacetAbiData from './abis/TradingFacet.json';
import liquidityFacetAbiData from './abis/LiquidityFacet.json';
import settlementFacetAbiData from './abis/SettlementFacet.json';
import usdcAbiData from './abis/MockUSDC.json';
import positionTokenAbiData from './abis/PositionToken.json';
import chainlinkResolverLegacyAbiData from './abis/ChainlinkResolver.legacy.json';
import chainlinkResolverV2AbiData from './abis/ChainlinkResolver.v2.json';
import type { Network } from './contracts';

// Helper to extract ABI from wrapped or unwrapped format
const extractAbi = (data: any) => Array.isArray(data) ? data : ((data as any).abi || data);

// Old monolithic SpeculateCore (Mainnet)
export const speculateCoreAbi = extractAbi(speculateCoreAbiData) as any;

// Diamond architecture (Testnet)
export const speculateCoreRouterAbi = extractAbi(speculateCoreRouterAbiData) as any;
export const marketFacetAbi = extractAbi(marketFacetAbiData) as any;
export const tradingFacetAbi = extractAbi(tradingFacetAbiData) as any;
export const liquidityFacetAbi = extractAbi(liquidityFacetAbiData) as any;
export const settlementFacetAbi = extractAbi(settlementFacetAbiData) as any;

// Combined ABI for Router (includes all facet functions)
// This allows calling facet functions directly on the router address
export const coreAbiTestnet = [
  ...speculateCoreRouterAbi,
  ...marketFacetAbi,
  ...tradingFacetAbi,
  ...liquidityFacetAbi,
  ...settlementFacetAbi,
] as any;

// Mainnet uses old monolithic core ABI
export const coreAbiMainnet = speculateCoreAbi;

// Network-aware selector (recommended)
export function getCoreAbi(network: Network) {
  return network === 'mainnet' ? coreAbiMainnet : coreAbiTestnet;
}

// Backward-compat default:
// keep exporting `coreAbi`, but default it to Testnet (Router+Facets).
// Call-sites that must support both networks should use `getCoreAbi(...)`.
export const coreAbi = coreAbiTestnet;

// Token ABIs
export const usdcAbi = extractAbi(usdcAbiData) as any;
export const positionTokenAbi = extractAbi(positionTokenAbiData) as any;

// Resolver ABIs
export const chainlinkResolverAbiLegacy = extractAbi(chainlinkResolverLegacyAbiData) as any;
export const chainlinkResolverAbiV2 = extractAbi(chainlinkResolverV2AbiData) as any;

export function getChainlinkResolverAbi(network: Network) {
  // Mainnet currently uses legacy resolver; Testnet Diamond uses the new resolver.
  return network === 'mainnet' ? chainlinkResolverAbiLegacy : chainlinkResolverAbiV2;
}
