import type { Abi } from 'viem';
import speculateCoreAbiData from './abis/SpeculateCore.json';
import speculateCoreRouterAbiData from './abis/SpeculateCoreRouter.json';
import marketFacetAbiData from './abis/MarketFacet.json';
import tradingFacetAbiData from './abis/TradingFacet.json';
import liquidityFacetAbiData from './abis/LiquidityFacet.json';
import settlementFacetAbiData from './abis/SettlementFacet.json';
import adminFacetAbiData from './abis/AdminFacet.json';
import usdcAbiData from './abis/MockUSDC.json';
import positionTokenAbiData from './abis/PositionToken.json';
import chainlinkResolverLegacyAbiData from './abis/ChainlinkResolver.legacy.json';
import chainlinkResolverV2AbiData from './abis/ChainlinkResolver.v2.json';
import treasuryAbiData from './abis/Treasury.json';
import type { Network } from './contracts';
import { isDiamondNetwork } from './contracts';

// Helper to extract ABI from wrapped or unwrapped format
const extractAbi = (data: any): Abi => {
  const abi = Array.isArray(data) ? data : (data.abi || data);
  return abi as Abi;
};

// Old monolithic SpeculateCore (Mainnet)
export const speculateCoreAbi = extractAbi(speculateCoreAbiData);

// Diamond architecture (Testnet)
export const speculateCoreRouterAbi = extractAbi(speculateCoreRouterAbiData);
export const marketFacetAbi = extractAbi(marketFacetAbiData);
export const tradingFacetAbi = extractAbi(tradingFacetAbiData);
export const liquidityFacetAbi = extractAbi(liquidityFacetAbiData);
export const settlementFacetAbi = extractAbi(settlementFacetAbiData);
export const adminFacetAbi = extractAbi(adminFacetAbiData);

// Combined ABI for Router (includes all facet functions)
// This allows calling facet functions directly on the router address
export const coreAbiTestnet = [
  ...speculateCoreRouterAbi,
  ...marketFacetAbi,
  ...tradingFacetAbi,
  ...liquidityFacetAbi,
  ...settlementFacetAbi,
  ...adminFacetAbi,
] as const as Abi;

// Mainnet uses old monolithic core ABI
export const coreAbiMainnet = speculateCoreAbi;

/**
 * Get the core protocol ABI based on the network type.
 * @param network The current network (mainnet or testnet)
 * @returns The appropriate ABI for the protocol
 */
export function getCoreAbi(network: Network): Abi {
  // If mainnet is deployed as Diamond, use the Router+Facets ABI.
  return isDiamondNetwork(network) ? coreAbiTestnet : coreAbiMainnet;
}

// Backward-compat default:
// keep exporting `coreAbi`, but default it to Testnet (Router+Facets).
// Call-sites that must support both networks should use `getCoreAbi(...)`.
export const coreAbi = coreAbiTestnet;

// Token ABIs
export const usdcAbi = extractAbi(usdcAbiData);
export const positionTokenAbi = extractAbi(positionTokenAbiData);
export const treasuryAbi = extractAbi(treasuryAbiData);

// Resolver ABIs
export const chainlinkResolverAbiLegacy = extractAbi(chainlinkResolverLegacyAbiData);
export const chainlinkResolverAbiV2 = extractAbi(chainlinkResolverV2AbiData);

/**
 * Get the Chainlink Resolver ABI based on the network type.
 */
export function getChainlinkResolverAbi(network: Network): Abi {
  // Diamond uses the new resolver; legacy monolith uses legacy resolver ABI.
  return isDiamondNetwork(network) ? chainlinkResolverAbiV2 : chainlinkResolverAbiLegacy;
}
