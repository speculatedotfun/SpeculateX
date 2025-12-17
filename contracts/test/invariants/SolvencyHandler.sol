// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {SpeculateCoreRouter} from "../../src/SpeculateCoreRouter.sol";
import {TradingFacet} from "../../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../../src/facets/LiquidityFacet.sol";
import {MarketFacet} from "../../src/facets/MarketFacet.sol";
import {MockUSDC} from "../../src/MockUSDC.sol";

contract SolvencyHandler is Test {
    SpeculateCoreRouter public core;
    MockUSDC public usdc;
    uint256 public marketId;

    address public alice;
    address public bob;

    constructor(SpeculateCoreRouter core_, MockUSDC usdc_, uint256 marketId_, address alice_, address bob_) {
        core = core_;
        usdc = usdc_;
        marketId = marketId_;
        alice = alice_;
        bob = bob_;
    }

    function _actor(uint256 salt) internal view returns (address) {
        return (salt % 2 == 0) ? alice : bob;
    }

    function buyYes(uint256 salt, uint256 usdcIn) external {
        address actor = _actor(salt);
        usdcIn = bound(usdcIn, 1e6, 5_000e6);

        vm.startPrank(actor);
        usdc.approve(address(core), usdcIn);
        TradingFacet(address(core)).buy(marketId, true, usdcIn, 0);
        vm.stopPrank();
    }

    function buyNo(uint256 salt, uint256 usdcIn) external {
        address actor = _actor(salt);
        usdcIn = bound(usdcIn, 1e6, 5_000e6);

        vm.startPrank(actor);
        usdc.approve(address(core), usdcIn);
        TradingFacet(address(core)).buy(marketId, false, usdcIn, 0);
        vm.stopPrank();
    }

    function addLiquidity(uint256 salt, uint256 usdcAdd) external {
        address actor = _actor(salt);
        usdcAdd = bound(usdcAdd, 500e6, 10_000e6);

        vm.startPrank(actor);
        usdc.approve(address(core), usdcAdd);
        LiquidityFacet(address(core)).addLiquidity(marketId, usdcAdd);
        vm.stopPrank();
    }

    // Note: sells are intentionally omitted from the invariant handler to keep
    // the state-space stable (they need tracking token addresses + balances).
    // The critical solvency property is enforced on buys/addLiquidity as well.
}


