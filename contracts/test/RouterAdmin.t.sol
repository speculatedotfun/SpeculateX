// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TestSetup} from "./TestSetup.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";
import {ForceSendETH} from "./ForceSendETH.sol";

contract RouterAdminTest is TestSetup {
    uint256 internal marketId;

    function setUp() public override {
        super.setUp();
        usdc.faucet(25_000e6);
        marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );
    }

    function test_pause_unpause() public {
        // Pause
        bytes32 pauseOp = core.scheduleOp(core.OP_PAUSE(), "");
        vm.warp(block.timestamp + core.minTimelockDelay());
        core.executePause(pauseOp);
        
        // Trading should be paused
        vm.startPrank(alice);
        usdc.approve(address(core), 1_000e6);
        vm.expectRevert(SpeculateCoreRouter.Paused.selector);
        TradingFacet(address(core)).buy(marketId, true, 1_000e6, 0);
        vm.stopPrank();
        
        // Unpause
        bytes32 unpauseOp = core.scheduleOp(core.OP_UNPAUSE(), "");
        vm.warp(block.timestamp + core.minTimelockDelay());
        core.executeUnpause(unpauseOp);
        
        // Trading should work again
        vm.startPrank(alice);
        TradingFacet(address(core)).buy(marketId, true, 1_000e6, 0);
        vm.stopPrank();
    }

    function test_pause_allowsSettlementFunctions() public {
        // Pause
        bytes32 pauseOp = core.scheduleOp(core.OP_PAUSE(), "");
        vm.warp(block.timestamp + core.minTimelockDelay());
        core.executePause(pauseOp);
        
        // Settlement functions should still work
        vm.warp(block.timestamp + 8 days);
        vm.prank(address(resolver));
        SettlementFacet(address(core)).resolveMarketWithPrice(marketId, 150e8);
        // Should succeed
    }

    function test_recoverETH() public {
        // Router rejects ETH via receive()
        vm.expectRevert("NO_ETH");
        (bool success, ) = address(core).call{value: 1 ether}("");
        assertFalse(success);
        
        // Force send ETH using selfdestruct pattern (bypass receive)
        // We'll use a helper contract to force send exactly 1 ETH.
        ForceSendETH forceSend = new ForceSendETH();
        vm.deal(address(forceSend), 1 ether);
        // NOTE: do NOT also send value here, or the helper will selfdestruct with 2 ETH.
        forceSend.sendETH(address(core));
        assertEq(address(core).balance, 1 ether);
        
        // Recover ETH to an EOA (admin here is the test contract address and may not accept ETH).
        address payable recipient = payable(alice);
        bytes32 opId = core.scheduleOp(core.OP_RECOVER_ETH(), abi.encode(recipient));
        vm.warp(block.timestamp + core.minTimelockDelay());
        
        uint256 coreBefore = address(core).balance;
        assertEq(coreBefore, 1 ether);
        
        uint256 recipientBefore = recipient.balance;
        vm.prank(admin);
        core.executeRecoverETH(opId, recipient);
        uint256 recipientAfter = recipient.balance;
        uint256 coreAfter = address(core).balance;
        
        // Recipient should receive the ETH from the core
        assertEq(recipientAfter, recipientBefore + 1 ether);
        assertEq(coreAfter, 0);
    }

    function test_pause_revertsOnNonAdmin() public {
        bytes32 pauseOp = core.scheduleOp(core.OP_PAUSE(), "");
        vm.warp(block.timestamp + core.minTimelockDelay());
        
        vm.prank(alice);
        vm.expectRevert();
        core.executePause(pauseOp);
    }

    function test_recoverETH_revertsOnNonAdmin() public {
        vm.deal(address(core), 1 ether);
        bytes32 opId = core.scheduleOp(core.OP_RECOVER_ETH(), abi.encode(payable(admin)));
        vm.warp(block.timestamp + core.minTimelockDelay());
        
        vm.prank(alice);
        vm.expectRevert();
        core.executeRecoverETH(opId, payable(admin));
    }
}

