import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  MarketCreated,
  ScheduledMarketCreated,
  Buy,
  Sell,
  LiquidityAdded,
  LiquidityRemoved,
  LpFeesClaimed,
  Redeemed,
  MarketResolved,
  MarketCancelled,
  LpResidualClaimed,
  ResidualFinalized,
} from '../generated/SpeculateCore/SpeculateCore';
import {
  OpScheduled,
  OpExecuted,
  OpCancelled,
  CoreUpdated,
  MaxStalenessUpdated,
  TimelockDelayUpdated,
  MarketResolved as ResolverMarketResolved,
  MarketResolvedTwap,
  MarketResolvedLate,
  UpkeepPayload,
} from '../generated/ChainlinkResolver/ChainlinkResolver';
import {
  Withdraw,
  LargeWithdrawScheduled,
  LargeWithdrawCancelled,
  LargeWithdrawExecuted,
  DailyLimitUpdated,
} from '../generated/Treasury/Treasury';
import {
  Market,
  Trade,
  PositionBalance,
  Redemption,
  User,
  GlobalState,
  ResolverEvent,
  TreasuryEvent,
  LiquidityEvent,
  LpFeeClaim,
  LpResidualClaim,
  ResidualFinalization,
} from '../generated/schema';

const NEG_ONE = BigInt.fromI32(-1);
const GLOBAL_ID = 'global';

function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_ID);
  if (state === null) {
    state = new GlobalState(GLOBAL_ID);
    state.uniqueTraders = 0;
  }
  return state as GlobalState;
}

function getOrCreateUser(address: Address): User {
  const id = address.toHexString();
  let user = User.load(id);
  if (user === null) {
    user = new User(id);
    user.save();

    const globalState = getOrCreateGlobalState();
    globalState.uniqueTraders = globalState.uniqueTraders + 1;
    globalState.save();
  }
  return user as User;
}

function getOrCreatePositionBalance(
  marketId: string,
  userId: string,
  side: string,
): PositionBalance {
  const id = marketId + '-' + userId + '-' + side;
  let balance = PositionBalance.load(id);
  if (balance === null) {
    balance = new PositionBalance(id);
    balance.market = marketId;
    balance.user = userId;
    balance.side = side;
    balance.tokenBalance = BigInt.fromI32(0);
  }
  return balance as PositionBalance;
}

function createTradeId(txHash: Bytes, logIndex: BigInt): string {
  return txHash.toHexString() + '-' + logIndex.toString();
}

function subtractSafely(value: BigInt, decrement: BigInt): BigInt {
  if (value.ge(decrement)) {
    return value.minus(decrement);
  }
  return BigInt.fromI32(0);
}

export function handleMarketCreated(event: MarketCreated): void {
  const marketId = event.params.id.toString();
  let market = Market.load(marketId);
  if (market !== null) {
    return;
  }

  market = new Market(marketId);
  
  // Event params: id, yes, no, questionHash, question, initUsdc, expiryTimestamp
  // (questionHash is ignored, we use question string directly)
  market.yesToken = event.params.yes;
  market.noToken = event.params.no;
  market.question = event.params.question;
  market.initUsdc = event.params.initUsdc;
  market.expiryTimestamp = event.params.expiryTimestamp;
  
  market.createdAt = event.block.timestamp;
  market.blockNumber = event.block.number;
  market.txHash = event.transaction.hash;
  market.totalVolumeUsdc = BigInt.fromI32(0);
  market.totalTokensYes = BigInt.fromI32(0);
  market.totalTokensNo = BigInt.fromI32(0);
  market.isResolved = false;
  market.isScheduled = false;
  market.startTime = null;
  market.isCancelled = false;
  market.save();
}

export function handleScheduledMarketCreated(event: ScheduledMarketCreated): void {
  const marketId = event.params.id.toString();
  let market = Market.load(marketId);
  if (market !== null) {
    return;
  }

  market = new Market(marketId);
  
  // Event params: id, yes, no, questionHash, question, initUsdc, startTime, expiryTimestamp
  market.yesToken = event.params.yes;
  market.noToken = event.params.no;
  market.question = event.params.question;
  market.initUsdc = event.params.initUsdc;
  market.startTime = event.params.startTime;
  market.expiryTimestamp = event.params.expiryTimestamp;
  
  market.createdAt = event.block.timestamp;
  market.blockNumber = event.block.number;
  market.txHash = event.transaction.hash;
  market.totalVolumeUsdc = BigInt.fromI32(0);
  market.totalTokensYes = BigInt.fromI32(0);
  market.totalTokensNo = BigInt.fromI32(0);
  market.isResolved = false;
  market.isScheduled = true;
  market.isCancelled = false;
  market.save();
}

export function handleBuy(event: Buy): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.user);
  const trade = new Trade(createTradeId(event.transaction.hash, event.logIndex));
  trade.market = marketId;
  trade.txHash = event.transaction.hash;
  trade.logIndex = event.logIndex;
  trade.blockNumber = event.block.number;
  trade.timestamp = event.block.timestamp;
  trade.user = user.id;
  trade.action = 'buy';
  trade.side = event.params.isYes ? 'yes' : 'no';
  trade.tokenDelta = event.params.sharesOut;
  trade.usdcDelta = event.params.usdcIn.times(NEG_ONE);
  trade.priceE6 = event.params.pYesE6;
  trade.save();

  market.totalVolumeUsdc = market.totalVolumeUsdc.plus(event.params.usdcIn);
  if (event.params.isYes) {
    market.totalTokensYes = market.totalTokensYes.plus(event.params.sharesOut);
  } else {
    market.totalTokensNo = market.totalTokensNo.plus(event.params.sharesOut);
  }
  market.save();

  const balance = getOrCreatePositionBalance(marketId, user.id, trade.side);
  balance.tokenBalance = balance.tokenBalance.plus(event.params.sharesOut);
  balance.save();
}

export function handleSell(event: Sell): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.user);
  const trade = new Trade(createTradeId(event.transaction.hash, event.logIndex));
  trade.market = marketId;
  trade.txHash = event.transaction.hash;
  trade.logIndex = event.logIndex;
  trade.blockNumber = event.block.number;
  trade.timestamp = event.block.timestamp;
  trade.user = user.id;
  trade.action = 'sell';
  trade.side = event.params.isYes ? 'yes' : 'no';
  trade.tokenDelta = event.params.sharesIn.times(NEG_ONE);
  trade.usdcDelta = event.params.usdcOut;
  trade.priceE6 = event.params.pYesE6;
  trade.save();

  market.totalVolumeUsdc = market.totalVolumeUsdc.plus(event.params.usdcOut);
  if (event.params.isYes) {
    market.totalTokensYes = subtractSafely(market.totalTokensYes, event.params.sharesIn);
  } else {
    market.totalTokensNo = subtractSafely(market.totalTokensNo, event.params.sharesIn);
  }
  market.save();

  const balance = getOrCreatePositionBalance(marketId, user.id, trade.side);
  balance.tokenBalance = subtractSafely(balance.tokenBalance, event.params.sharesIn);
  balance.save();
}

export function handleLiquidityAdded(event: LiquidityAdded): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.lp);
  const liquidityEvent = new LiquidityEvent(createTradeId(event.transaction.hash, event.logIndex));
  liquidityEvent.market = marketId;
  liquidityEvent.user = user.id;
  liquidityEvent.action = 'add';
  liquidityEvent.usdcAmount = event.params.usdcAdd;
  liquidityEvent.newB = event.params.newB;
  liquidityEvent.txHash = event.transaction.hash;
  liquidityEvent.blockNumber = event.block.number;
  liquidityEvent.timestamp = event.block.timestamp;
  liquidityEvent.save();
}

export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.lp);
  const liquidityEvent = new LiquidityEvent(createTradeId(event.transaction.hash, event.logIndex));
  liquidityEvent.market = marketId;
  liquidityEvent.user = user.id;
  liquidityEvent.action = 'remove';
  liquidityEvent.usdcAmount = event.params.usdcRemove;
  liquidityEvent.newB = event.params.newB;
  liquidityEvent.txHash = event.transaction.hash;
  liquidityEvent.blockNumber = event.block.number;
  liquidityEvent.timestamp = event.block.timestamp;
  liquidityEvent.save();
}

export function handleLpFeesClaimed(event: LpFeesClaimed): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.lp);
  const claim = new LpFeeClaim(createTradeId(event.transaction.hash, event.logIndex));
  claim.market = marketId;
  claim.user = user.id;
  claim.amount = event.params.amount;
  claim.txHash = event.transaction.hash;
  claim.blockNumber = event.block.number;
  claim.timestamp = event.block.timestamp;
  claim.save();
}

export function handleRedeemed(event: Redeemed): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const user = getOrCreateUser(event.params.user);
  const redemption = new Redemption(createTradeId(event.transaction.hash, event.logIndex));
  redemption.market = marketId;
  redemption.user = user.id;
  redemption.amount = event.params.payoutUSDC;
  redemption.txHash = event.transaction.hash;
  redemption.blockNumber = event.block.number;
  redemption.timestamp = event.block.timestamp;
  redemption.save();
}

export function handleMarketResolved(event: MarketResolved): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  market.isResolved = true;
  market.yesWins = event.params.yesWins;
  market.resolutionTimestamp = event.block.timestamp;
  market.resolutionTxHash = event.transaction.hash;
  market.save();
}

export function handleMarketCancelled(event: MarketCancelled): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  market.isCancelled = true;
  market.cancellationTimestamp = event.block.timestamp;
  market.cancellationTxHash = event.transaction.hash;
  market.save();
}

export function handleLpResidualClaimed(event: LpResidualClaimed): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const lp = getOrCreateUser(event.params.lp);
  const claimId = createTradeId(event.transaction.hash, event.logIndex);
  const claim = new LpResidualClaim(claimId);
  claim.market = marketId;
  claim.lp = lp.id;
  claim.amount = event.params.amount;
  claim.txHash = event.transaction.hash;
  claim.blockNumber = event.block.number;
  claim.timestamp = event.block.timestamp;
  claim.save();
}

export function handleResidualFinalized(event: ResidualFinalized): void {
  const marketId = event.params.id.toString();
  const market = Market.load(marketId);
  if (market === null) {
    return;
  }

  const finalizationId = marketId + '-residual-finalized';
  let finalization = ResidualFinalization.load(finalizationId);
  if (finalization === null) {
    finalization = new ResidualFinalization(finalizationId);
  }

  finalization.market = marketId;
  finalization.residue = event.params.residue;
  finalization.totalLp = event.params.totalLp;
  finalization.txHash = event.transaction.hash;
  finalization.blockNumber = event.block.number;
  finalization.timestamp = event.block.timestamp;
  finalization.save();
}

export function handleResolverOpScheduled(event: OpScheduled): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'OpScheduled';
  entry.opId = event.params.opId;
  entry.tag = event.params.tag;
  entry.readyAt = event.params.readyAt;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverOpExecuted(event: OpExecuted): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'OpExecuted';
  entry.opId = event.params.opId;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverOpCancelled(event: OpCancelled): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'OpCancelled';
  entry.opId = event.params.opId;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverCoreUpdated(event: CoreUpdated): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'CoreUpdated';
  entry.newCore = event.params.newCore;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverMaxStalenessUpdated(event: MaxStalenessUpdated): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'MaxStalenessUpdated';
  entry.newMaxStaleness = event.params.newMaxStaleness;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverTimelockDelayUpdated(event: TimelockDelayUpdated): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'TimelockDelayUpdated';
  entry.newDelay = event.params.newDelay;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverMarketResolved(event: ResolverMarketResolved): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'MarketResolved';
  entry.market = event.params.marketId.toString();
  entry.feed = event.params.feed;
  entry.price = event.params.price;
  entry.updatedAt = event.params.updatedAt;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverMarketResolvedTwap(event: MarketResolvedTwap): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'MarketResolvedTwap';
  entry.market = event.params.marketId.toString();
  entry.feed = event.params.feed;
  entry.twapPrice = event.params.twapPrice;
  entry.windowStart = event.params.windowStart;
  entry.windowEnd = event.params.windowEnd;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverMarketResolvedLate(event: MarketResolvedLate): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'MarketResolvedLate';
  entry.market = event.params.marketId.toString();
  entry.feed = event.params.feed;
  entry.updatedAt = event.params.updatedAt;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleResolverUpkeepPayload(event: UpkeepPayload): void {
  const entry = new ResolverEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'UpkeepPayload';
  entry.payloadLen = event.params.len;
  entry.payloadWord0 = event.params.w0;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleTreasuryWithdraw(event: Withdraw): void {
  const entry = new TreasuryEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'Withdraw';
  entry.token = event.params.token;
  entry.to = event.params.to;
  entry.amount = event.params.amount;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleTreasuryLargeWithdrawScheduled(event: LargeWithdrawScheduled): void {
  const entry = new TreasuryEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'LargeWithdrawScheduled';
  entry.opId = event.params.opId;
  entry.token = event.params.token;
  entry.to = event.params.to;
  entry.amount = event.params.amount;
  entry.readyAt = event.params.readyAt;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleTreasuryLargeWithdrawCancelled(event: LargeWithdrawCancelled): void {
  const entry = new TreasuryEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'LargeWithdrawCancelled';
  entry.opId = event.params.opId;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleTreasuryLargeWithdrawExecuted(event: LargeWithdrawExecuted): void {
  const entry = new TreasuryEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'LargeWithdrawExecuted';
  entry.opId = event.params.opId;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

export function handleTreasuryDailyLimitUpdated(event: DailyLimitUpdated): void {
  const entry = new TreasuryEvent(createTradeId(event.transaction.hash, event.logIndex));
  entry.type = 'DailyLimitUpdated';
  entry.oldLimit = event.params.oldLimit;
  entry.newLimit = event.params.newLimit;
  entry.txHash = event.transaction.hash;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.save();
}

