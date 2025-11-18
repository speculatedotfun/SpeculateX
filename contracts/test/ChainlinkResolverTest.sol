// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

contract ChainlinkResolverTest is BaseTest {
    // Mock Chainlink aggregator
    MockAggregator internal btcAggregator;
    MockAggregator internal ethAggregator;

    bytes32 internal constant BTC_FEED_ID = keccak256("BTC/USD");
    bytes32 internal constant ETH_FEED_ID = keccak256("ETH/USD");

    function setUp() public override {
        super.setUp();

        // Deploy mock aggregators
        btcAggregator = new MockAggregator();
        ethAggregator = new MockAggregator();

        // Set initial prices
        btcAggregator.setPrice(50000e8); // $50,000 with 8 decimals
        ethAggregator.setPrice(3000e8);  // $3,000 with 8 decimals

        // Setup feeds in resolver
        vm.startPrank(admin);
        resolver.setGlobalFeed(BTC_FEED_ID, address(btcAggregator));
        resolver.setGlobalFeed(ETH_FEED_ID, address(ethAggregator));
        vm.stopPrank();
    }

    function test_SetupFeeds() public {
        assertEq(resolver.globalFeeds(BTC_FEED_ID), address(btcAggregator));
        assertEq(resolver.globalFeeds(ETH_FEED_ID), address(ethAggregator));
    }

    function test_CheckUpkeep_NoMarkets() public {
        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }

    function test_CheckUpkeep_MarketNotExpired() public {
        uint256 marketId = createTestMarket();

        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        assertFalse(upkeepNeeded);
    }

    function test_CheckUpkeep_MarketExpired() public {
        // Create market with Chainlink feed (required for resolver)
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        assertTrue(upkeepNeeded);

        // Resolver returns (marketId, nextBatchStart)
        (uint256 returnedMarketId, ) = abi.decode(performData, (uint256, uint256));
        assertEq(returnedMarketId, marketId);
    }

    function test_CheckUpkeep_MultipleMarkets() public {
        // Create markets with Chainlink feeds
        vm.prank(marketCreator);
        uint256 market1 = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        vm.prank(marketCreator);
        uint256 market2 = core.createMarket(
            "Will ETH hit $3k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 2 days,
            address(ethAggregator),
            ETH_FEED_ID,
            3000e8,
            SpeculateCore.Comparison.Above
        );

        // Only expire market1
        vm.warp(block.timestamp + 2 days);

        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        assertTrue(upkeepNeeded);

        // Resolver returns (marketId, nextBatchStart)
        (uint256 returnedMarketId, ) = abi.decode(performData, (uint256, uint256));
        assertEq(returnedMarketId, market1); // Should return first expired market
    }

    function test_ResolveWithFeed() public {
        // Create market with Chainlink feed
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8, // $60k target
            SpeculateCore.Comparison.Above
        );

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        // Set price above target
        btcAggregator.setPrice(65000e8); // $65k

        // Resolve with feed
        vm.prank(admin);
        core.resolveWithFeed(marketId);

        SpeculateCore.ResolutionConfig memory resolution = core.getMarketResolution(marketId);
        assertTrue(resolution.yesWins);
        assertTrue(resolution.isResolved);
    }

    function test_ResolveWithFeed_BelowTarget() public {
        // Create market with Chainlink feed
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $40k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            40000e8, // $40k target
            SpeculateCore.Comparison.Above
        );

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        // Set price below target
        btcAggregator.setPrice(35000e8); // $35k

        // Resolve with feed
        vm.prank(admin);
        core.resolveWithFeed(marketId);

        SpeculateCore.ResolutionConfig memory resolution = core.getMarketResolution(marketId);
        assertFalse(resolution.yesWins);
        assertTrue(resolution.isResolved);
    }

    function test_ResolveWithFeed_StalePrice() public {
        // Create market with Chainlink feed
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        // Make price stale (update time > 1 hour ago)
        btcAggregator.setUpdatedAt(block.timestamp - 2 hours);

        // Should revert due to stale price
        vm.prank(admin);
        vm.expectRevert();
        core.resolveWithFeed(marketId);
    }

    function test_ResolveWithFeed_PriceBounds() public {
        // First, resolve a market via resolver to set lastValidPrice
        vm.prank(marketCreator);
        uint256 marketId1 = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        vm.warp(block.timestamp + 2 days);
        btcAggregator.setPrice(50000e8); // Set valid price
        
        // Resolve via resolver to set lastValidPrice
        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        require(upkeepNeeded, "upkeep should be needed");
        vm.prank(admin);
        resolver.performUpkeep(performData); // This sets lastValidPrice to 50000e8

        // Now create a new market and try to resolve with out-of-bounds price
        vm.prank(marketCreator);
        uint256 marketId2 = core.createMarket(
            "Will BTC hit $70k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            70000e8,
            SpeculateCore.Comparison.Above
        );

        vm.warp(block.timestamp + 2 days);
        btcAggregator.setPrice(80000e8); // $80k (60% increase from $50k, >50% limit)

        // Should revert due to price bounds violation when resolving via resolver
        (bool upkeepNeeded2, bytes memory performData2) = resolver.checkUpkeep("");
        require(upkeepNeeded2, "upkeep should be needed");
        vm.prank(admin);
        vm.expectRevert(); // Should revert with "price out of bounds"
        resolver.performUpkeep(performData2);
    }

    function test_SecondaryFeedVerification() public {
        // Setup secondary feed
        MockAggregator btcSecondary = new MockAggregator();

        vm.prank(admin);
        resolver.setSecondaryFeed(BTC_FEED_ID, address(btcSecondary));

        // Create market
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        // Fast forward and resolve
        vm.warp(block.timestamp + 2 days);

        // Set prices on both feeds (within tolerance)
        btcAggregator.setPrice(65000e8); // Primary: $65k
        btcSecondary.setPrice(65000e8); // Secondary: $65k (same, within 2% tolerance)

        vm.prank(admin);
        core.resolveWithFeed(marketId);

        SpeculateCore.ResolutionConfig memory resolution = core.getMarketResolution(marketId);
        assertTrue(resolution.yesWins);
    }

    function test_SecondaryFeedMismatch() public {
        // Setup secondary feed
        MockAggregator btcSecondary = new MockAggregator();

        vm.prank(admin);
        resolver.setSecondaryFeed(BTC_FEED_ID, address(btcSecondary));

        // Create market
        vm.prank(marketCreator);
        uint256 marketId = core.createMarket(
            "Will BTC hit $60k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 1 days,
            address(btcAggregator),
            BTC_FEED_ID,
            60000e8,
            SpeculateCore.Comparison.Above
        );

        // Fast forward
        vm.warp(block.timestamp + 2 days);

        // Set prices that differ by more than tolerance (default 2% = 200 bps)
        btcAggregator.setPrice(65000e8); // Primary: $65k
        btcSecondary.setPrice(63000e8); // Secondary: $63k (3% difference, >2% tolerance)

        // Should revert due to secondary feed mismatch when resolving via resolver
        (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep("");
        require(upkeepNeeded, "upkeep should be needed");
        vm.prank(admin);
        vm.expectRevert(); // Should revert with "oracle mismatch"
        resolver.performUpkeep(performData);
    }
}

// Mock Chainlink Aggregator for testing
contract MockAggregator {
    int256 private _price;
    uint256 private _updatedAt;

    constructor() {
        _updatedAt = block.timestamp;
    }

    function setPrice(int256 price) external {
        _price = price;
        _updatedAt = block.timestamp;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, _price, block.timestamp, _updatedAt, 1);
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }
}
