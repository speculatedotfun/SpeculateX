const { ethers } = require("ethers");

// BSC Testnet RPC
const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract Addresses (from CONTRACT_ADDRESSES.md)
const RESOLVER_ADDRESS = "0x5E4Bf042933B9f8ec0789F97Df8179558960b412";
// const CORE_ADDRESS = "0x769706b79F3AfCb2D2aaa658D4444f68E6A03489";

// Minimal ABI for Resolver
const RESOLVER_ABI = [
    "function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)",
    "function resolve(uint256 marketId, uint80 roundId) external",
    "function ops(bytes32) view returns (bytes32 tag, bytes32 dataHash, uint256 readyAt, uint8 status)"
];

async function main() {
    console.log("Using RPC:", RPC_URL);
    console.log("Resolver Address:", RESOLVER_ADDRESS);

    const resolver = new ethers.Contract(RESOLVER_ADDRESS, RESOLVER_ABI, provider);

    // Check a few market IDs
    const marketIdsToCheck = [1, 2, 3, 4, 5];

    for (const id of marketIdsToCheck) {
        console.log(`\n--- Checking Market ID: ${id} ---`);

        // ABI Encode the marketId as bytes for checkUpkeep
        // Solidity: abi.encode(marketId) -> uint256 padded to 32 bytes
        const checkData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [id]);

        try {
            console.log(`Calling checkUpkeep with data for marketId ${id}...`);
            const [upkeepNeeded, performData] = await resolver.checkUpkeep(checkData);

            console.log(`Result for Market ${id}:`);
            console.log(`  upkeepNeeded: ${upkeepNeeded}`);
            console.log(`  performData: ${performData}`);

            if (upkeepNeeded) {
                console.log("  >>> UPKEEP IS NEEDED! Contract logic is working for this market.");
                // Decode performData
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256", "uint80"], performData);
                console.log(`  >>> performData decodes to: MarketId=${decoded[0]}, RoundId=${decoded[1]}`);
            } else {
                console.log("  >>> Upkeep NOT needed. Possible reasons: Market not expired, already resolved, or data stale.");
            }

        } catch (error) {
            console.error(`Error checking market ${id}:`, error.message);
            // For call reverts, it might be "NotChainlinkMarket" or similar if we could see reason
            if (error.data) {
                console.error("  Revert Data:", error.data);
            }
        }
    }

    // Also check checkUpkeep with empty data to see if it reverts or returns false (as per code checks)
    try {
        console.log("\n--- Checking with EMPTY checkData (simulating misconfigured Chainlink) ---");
        const emptyData = "0x";
        const [needed, data] = await resolver.checkUpkeep(emptyData);
        console.log(`Result for Empty Data: needed=${needed}`);
    } catch (error) {
        console.log("Check with empty data failed/reverted:", error.message);
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
