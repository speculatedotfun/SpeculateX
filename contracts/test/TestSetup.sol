// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Treasury} from "../src/Treasury.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";
import {CoreStorage} from "../src/CoreStorage.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";

abstract contract TestSetup is Test {
    address internal admin = address(this);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    MockUSDC internal usdc;
    Treasury internal treasury;
    SpeculateCoreRouter internal core;
    ChainlinkResolver internal resolver;
    MockAggregatorV3 internal mockOracle;

    MarketFacet internal marketFacet;
    TradingFacet internal tradingFacet;
    LiquidityFacet internal liquidityFacet;
    SettlementFacet internal settlementFacet;

    function setUp() public virtual {
        treasury = new Treasury(admin, 20_000e6);
        usdc = new MockUSDC(admin);
        core = new SpeculateCoreRouter(admin, address(usdc), address(treasury), 24 hours);

        marketFacet = new MarketFacet();
        tradingFacet = new TradingFacet();
        liquidityFacet = new LiquidityFacet();
        settlementFacet = new SettlementFacet();

        resolver = new ChainlinkResolver(admin, address(core));
        
        // Create a mock oracle feed (8 decimals, standard for price feeds)
        mockOracle = new MockAggregatorV3(8);

        _wireResolver(address(resolver));
        _wireFacets();

        // Seed oracle after timelock-driven warps so latestRoundData stays fresh at test runtime.
        uint256 ts = block.timestamp == 0 ? 1 : block.timestamp;
        mockOracle.setRoundData(1, int256(100e8), ts, ts, 1);

        // Seed users with USDC for tests
        vm.prank(alice);
        usdc.faucet(1_000_000e6);
        vm.prank(bob);
        usdc.faucet(1_000_000e6);
    }

    function _wireResolver(address newResolver) internal {
        bytes32 opId = core.scheduleOp(core.OP_SET_RESOLVER(), abi.encode(newResolver));
        vm.warp(block.timestamp + core.minTimelockDelay());
        core.executeSetResolver(opId, newResolver);
    }

    function _wireFacets() internal {
        _setFacet(MarketFacet.createMarket.selector, address(marketFacet));
        _setFacet(MarketFacet.getMarketState.selector, address(marketFacet));
        _setFacet(MarketFacet.getMarketResolution.selector, address(marketFacet));

        _setFacet(TradingFacet.spotPriceYesE18.selector, address(tradingFacet));
        _setFacet(TradingFacet.spotPriceYesE6.selector, address(tradingFacet));
        // TradingFacet.buy/sell are overloaded (deadline version). Use explicit legacy selectors.
        _setFacet(bytes4(keccak256("buy(uint256,bool,uint256,uint256)")), address(tradingFacet));
        _setFacet(bytes4(keccak256("sell(uint256,bool,uint256,uint256)")), address(tradingFacet));
        // Also register the deadline-enabled selectors for completeness.
        _setFacet(bytes4(keccak256("buy(uint256,bool,uint256,uint256,uint256)")), address(tradingFacet));
        _setFacet(bytes4(keccak256("sell(uint256,bool,uint256,uint256,uint256)")), address(tradingFacet));

        _setFacet(LiquidityFacet.addLiquidity.selector, address(liquidityFacet));
        _setFacet(LiquidityFacet.claimLpFees.selector, address(liquidityFacet));

        _setFacet(SettlementFacet.resolveMarketWithPrice.selector, address(settlementFacet));
        _setFacet(SettlementFacet.redeem.selector, address(settlementFacet));
        _setFacet(SettlementFacet.pendingLpResidual.selector, address(settlementFacet));
        _setFacet(SettlementFacet.claimLpResidual.selector, address(settlementFacet));
    }

    function _setFacet(bytes4 selector, address facet) internal {
        bytes32 opId = core.scheduleOp(core.OP_SET_FACET(), abi.encode(selector, facet));
        vm.warp(block.timestamp + core.minTimelockDelay());
        core.executeSetFacet(opId, selector, facet);
    }

    function _createBinaryMarket(
        address creator,
        uint256 initUsdc,
        uint256 expiryTimestamp,
        address oracleFeed,
        uint256 targetValue,
        CoreStorage.Comparison comparison
    ) internal returns (uint256 id) {
        // Default to mockOracle if address(0) is passed (for backward compatibility)
        if (oracleFeed == address(0)) {
            oracleFeed = address(mockOracle);
        }
        // Keep the oracle "fresh" at the time of market creation (tests warp time due to timelocks).
        if (oracleFeed == address(mockOracle)) {
            uint256 ts = block.timestamp == 0 ? 1 : block.timestamp;
            mockOracle.setRoundData(1, int256(100e8), ts, ts, 1);
            if (targetValue == 0) targetValue = 100e8;
        }
        vm.startPrank(creator);
        usdc.approve(address(core), initUsdc);
        id = MarketFacet(address(core)).createMarket(
            "Will price be above target?",
            "YES",
            "YES",
            "NO",
            "NO",
            initUsdc,
            expiryTimestamp,
            oracleFeed,
            bytes32(0),
            targetValue,
            comparison
        );
        vm.stopPrank();
    }
}


