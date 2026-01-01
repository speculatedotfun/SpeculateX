export interface MarketInfo {
    yes: `0x${string}`;
    no: `0x${string}`;
    qYes: bigint;
    qNo: bigint;
    bE18: bigint;
    usdcVault: bigint;
    feeTreasuryBps: number;
    feeVaultBps: number;
    feeLpBps: number;
    status: number;
    creator: `0x${string}`;
    totalLpUsdc: bigint;
    lpFeesUSDC: bigint;
    resolution: {
        startTime: bigint;
        expiryTimestamp: bigint;
        oracleType: number;
        oracleAddress: `0x${string}`;
        priceFeedId: `0x${string}`;
        targetValue: bigint;
        comparison: number;
        yesWins: boolean;
        isResolved: boolean;
    };
}

export interface MarketState {
    qYes: bigint;
    qNo: bigint;
    vault: bigint;
    b: bigint;
    pYesE6: bigint;
}

export interface MarketResolution {
    expiryTimestamp: bigint;
    oracleType: number;
    oracleAddress: `0x${string}`;
    priceFeedId: `0x${string}`;
    targetValue: bigint;
    comparison: number;
    yesWins: boolean;
    isResolved: boolean;
    startTime: bigint;
}
