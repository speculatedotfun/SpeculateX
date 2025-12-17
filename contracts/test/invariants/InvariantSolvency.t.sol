// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "../TestSetup.sol";
import {SolvencyHandler} from "./SolvencyHandler.sol";
import {MarketFacet} from "../../src/facets/MarketFacet.sol";
import {CoreStorage} from "../../src/CoreStorage.sol";
import {PositionToken} from "../../src/PositionToken.sol";
contract InvariantSolvencyTest is TestSetup {
    SolvencyHandler internal handler;
    uint256 internal marketId;

    function setUp() public override {
        super.setUp();

        // Give the market creator role to both actors so they can add liquidity if needed later.
        core.grantRole(core.MARKET_CREATOR_ROLE(), admin);

        // Fund admin for initial seed and create a market.
        usdc.faucet(2_000e6);
        marketId = _createBinaryMarket(
            admin,
            1_000e6,
            block.timestamp + 30 days,
            address(0),
            0,
            CoreStorage.Comparison.Above
        );

        handler = new SolvencyHandler(core, usdc, marketId, alice, bob);

        // Give users more USDC headroom for fuzzing
        vm.prank(alice);
        usdc.faucet(1_000_000e6);
        vm.prank(bob);
        usdc.faucet(1_000_000e6);

        targetContract(address(handler));
        // Narrow selectors to the safe operations we want fuzzed.
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = SolvencyHandler.buyYes.selector;
        selectors[1] = SolvencyHandler.buyNo.selector;
        selectors[2] = SolvencyHandler.addLiquidity.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_vaultCoversWorstCasePayout() public view {
        (uint256 qYes, uint256 qNo, uint256 vault, , , ) = MarketFacet(address(core)).getMarketState(marketId);
        // Liability must cover circulating supply only (exclude router-held locked shares).
        // The protocol may mint "locked" shares to the router when adding liquidity to preserve spot price.
        (
            PositionToken yesToken,
            PositionToken noToken,
            uint256 _qYes,
            uint256 _qNo,
            uint256 _bE18,
            uint256 _vault,
            uint16 _feeT,
            uint16 _feeLp,
            uint16 _feeV,
            CoreStorage.MarketStatus _status,
            bytes32 _questionHash,
            string memory _question,
            address _creator,
            uint256 _totalLp,
            uint256 _lpFeesUSDC,
            uint256 _residualUSDC,
            uint256 _priceBandThresholdUSDC,
            uint256 _maxJumpE18,
            CoreStorage.ResolutionConfig memory _resolution
        ) = core.markets(marketId);

        uint256 lockedYes = yesToken.balanceOf(address(core));
        uint256 lockedNo  = noToken.balanceOf(address(core));
        uint256 cirYes = qYes > lockedYes ? (qYes - lockedYes) : 0;
        uint256 cirNo  = qNo  > lockedNo  ? (qNo  - lockedNo)  : 0;

        uint256 maxCir = cirYes > cirNo ? cirYes : cirNo;
        uint256 liabilityUSDC = maxCir / 1e12;
        // TradingFacet uses `m.usdcVault + bufferUSDC < liabilityUSDC` as the failure condition.
        assertTrue(vault + 1000 >= liabilityUSDC);
    }
}


