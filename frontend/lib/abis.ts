// ABI compatibility layer - handles both wrapped and unwrapped ABIs
import speculateCoreAbiData from './abis/SpeculateCore.json';
import speculateCoreRouterAbiData from './abis/SpeculateCoreRouter.json';
import marketFacetAbiData from './abis/MarketFacet.json';
import tradingFacetAbiData from './abis/TradingFacet.json';
import liquidityFacetAbiData from './abis/LiquidityFacet.json';
import settlementFacetAbiData from './abis/SettlementFacet.json';
import usdcAbiData from './abis/MockUSDC.json';
import positionTokenAbiData from './abis/PositionToken.json';

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
export const coreAbi = [
  ...speculateCoreRouterAbi,
  ...marketFacetAbi,
  ...tradingFacetAbi,
  ...liquidityFacetAbi,
  ...settlementFacetAbi,
] as any;

// Token ABIs
export const usdcAbi = extractAbi(usdcAbiData) as any;
export const positionTokenAbi = extractAbi(positionTokenAbiData) as any;
