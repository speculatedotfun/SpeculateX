// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract TreasuryTest is Test {
    Treasury internal treasury;
    MockUSDC internal usdc;

    address internal admin = address(this);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal withdrawer = address(0x717D);

    uint256 internal constant INITIAL_DAILY_LIMIT = 100_000e6; // 100k USDC

    function setUp() public {
        usdc = new MockUSDC(admin);
        treasury = new Treasury(admin, INITIAL_DAILY_LIMIT);

        // Grant withdrawer role to withdrawer address
        treasury.grantRole(treasury.WITHDRAWER_ROLE(), withdrawer);

        // Fund treasury with USDC
        usdc.grantRole(usdc.MINTER_ROLE(), admin);
        usdc.mint(address(treasury), 10_000_000e6); // 10M USDC
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_constructor_setsCorrectValues() public view {
        assertEq(treasury.dailyWithdrawLimit(), INITIAL_DAILY_LIMIT);
        assertTrue(treasury.hasRole(treasury.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(treasury.hasRole(treasury.ADMIN_ROLE(), admin));
        assertTrue(treasury.hasRole(treasury.WITHDRAWER_ROLE(), admin));
    }

    function test_constructor_revertsOnZeroAdmin() public {
        vm.expectRevert(Treasury.ZeroAddress.selector);
        new Treasury(address(0), INITIAL_DAILY_LIMIT);
    }

    // ============================================
    // withdraw() Tests
    // ============================================

    function test_withdraw_basic() public {
        uint256 amount = 10_000e6;
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, amount);

        assertEq(usdc.balanceOf(alice) - aliceBefore, amount);
    }

    function test_withdraw_respectsDailyLimit() public {
        uint256 amount = 50_000e6;

        // First withdrawal - should succeed
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, amount);

        // Second withdrawal - should succeed (total 100k = limit)
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, amount);

        // Third withdrawal - should fail (exceeds limit)
        vm.prank(withdrawer);
        vm.expectRevert(Treasury.LimitExceeded.selector);
        treasury.withdraw(address(usdc), alice, 1e6);
    }

    function test_withdraw_resetsDailyLimit() public {
        uint256 amount = 100_000e6; // Full daily limit

        // Use full daily limit
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, amount);

        // Should fail - limit reached
        vm.prank(withdrawer);
        vm.expectRevert(Treasury.LimitExceeded.selector);
        treasury.withdraw(address(usdc), alice, 1e6);

        // Warp to next day
        vm.warp(block.timestamp + 1 days);

        // Should succeed - new day, limit reset
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, amount);
    }

    function test_withdraw_revertsOnZeroAddress() public {
        vm.prank(withdrawer);
        vm.expectRevert(Treasury.ZeroAddress.selector);
        treasury.withdraw(address(0), alice, 1_000e6);

        vm.prank(withdrawer);
        vm.expectRevert(Treasury.ZeroAddress.selector);
        treasury.withdraw(address(usdc), address(0), 1_000e6);
    }

    function test_withdraw_revertsOnZeroAmount() public {
        vm.prank(withdrawer);
        vm.expectRevert(Treasury.BadAmount.selector);
        treasury.withdraw(address(usdc), alice, 0);
    }

    function test_withdraw_revertsOnNonWithdrawer() public {
        vm.prank(alice);
        vm.expectRevert();
        treasury.withdraw(address(usdc), alice, 1_000e6);
    }

    function test_withdraw_tracksPerToken() public {
        // Create another mock token
        MockUSDC otherToken = new MockUSDC(admin);
        otherToken.grantRole(otherToken.MINTER_ROLE(), admin);
        otherToken.mint(address(treasury), 1_000_000e6);

        // Withdraw full limit of USDC
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, INITIAL_DAILY_LIMIT);

        // Should still be able to withdraw other token (separate tracking)
        vm.prank(withdrawer);
        treasury.withdraw(address(otherToken), alice, INITIAL_DAILY_LIMIT);
    }

    // ============================================
    // scheduleLargeWithdraw() Tests
    // ============================================

    function test_scheduleLargeWithdraw_basic() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        (address token, address to, uint256 amt, uint256 readyAt, Treasury.OpStatus status) = treasury.ops(opId);
        assertEq(token, address(usdc));
        assertEq(to, alice);
        assertEq(amt, amount);
        assertEq(readyAt, block.timestamp + 24 hours);
        assertTrue(status == Treasury.OpStatus.Scheduled);
    }

    function test_scheduleLargeWithdraw_revertsOnZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(Treasury.ZeroAddress.selector);
        treasury.scheduleLargeWithdraw(address(0), alice, 500_000e6);

        vm.prank(admin);
        vm.expectRevert(Treasury.ZeroAddress.selector);
        treasury.scheduleLargeWithdraw(address(usdc), address(0), 500_000e6);
    }

    function test_scheduleLargeWithdraw_revertsOnZeroAmount() public {
        vm.prank(admin);
        vm.expectRevert(Treasury.BadAmount.selector);
        treasury.scheduleLargeWithdraw(address(usdc), alice, 0);
    }

    function test_scheduleLargeWithdraw_revertsOnExcessiveAmount() public {
        // MAX_SINGLE_LARGE_WITHDRAW = 1_000_000e6
        vm.prank(admin);
        vm.expectRevert(Treasury.BadAmount.selector);
        treasury.scheduleLargeWithdraw(address(usdc), alice, 1_000_001e6);
    }

    function test_scheduleLargeWithdraw_revertsOnNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        treasury.scheduleLargeWithdraw(address(usdc), alice, 500_000e6);
    }

    // ============================================
    // executeLargeWithdraw() Tests
    // ============================================

    function test_executeLargeWithdraw_afterDelay() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        // Warp past delay
        vm.warp(block.timestamp + 24 hours);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(admin);
        treasury.executeLargeWithdraw(opId);
        uint256 aliceAfter = usdc.balanceOf(alice);

        assertEq(aliceAfter - aliceBefore, amount);

        // Verify status is Executed
        (, , , , Treasury.OpStatus status) = treasury.ops(opId);
        assertTrue(status == Treasury.OpStatus.Executed);
    }

    function test_executeLargeWithdraw_revertsBeforeDelay() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        // Try to execute immediately - should fail
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Treasury.NotReady.selector, block.timestamp + 24 hours));
        treasury.executeLargeWithdraw(opId);
    }

    function test_executeLargeWithdraw_revertsAfterExpiry() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        // Warp past expiry window (24h delay + 7 days expiry)
        vm.warp(block.timestamp + 24 hours + 7 days + 1);

        vm.prank(admin);
        vm.expectRevert(Treasury.OpExpired.selector);
        treasury.executeLargeWithdraw(opId);
    }

    function test_executeLargeWithdraw_revertsOnNonAdmin() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.warp(block.timestamp + 24 hours);

        vm.prank(alice);
        vm.expectRevert();
        treasury.executeLargeWithdraw(opId);
    }

    function test_executeLargeWithdraw_cannotExecuteTwice() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.warp(block.timestamp + 24 hours);

        vm.prank(admin);
        treasury.executeLargeWithdraw(opId);

        // Try to execute again - should fail
        vm.prank(admin);
        vm.expectRevert(Treasury.OpInvalid.selector);
        treasury.executeLargeWithdraw(opId);
    }

    function test_executeLargeWithdraw_bypassesDailyLimit() public {
        // Use full daily limit with regular withdraws
        vm.prank(withdrawer);
        treasury.withdraw(address(usdc), alice, INITIAL_DAILY_LIMIT);

        // Schedule large withdrawal
        uint256 largeAmount = 500_000e6;
        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), bob, largeAmount);

        vm.warp(block.timestamp + 24 hours);

        // Should succeed even though daily limit is exhausted
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(admin);
        treasury.executeLargeWithdraw(opId);
        uint256 bobAfter = usdc.balanceOf(bob);

        assertEq(bobAfter - bobBefore, largeAmount);
    }

    // ============================================
    // cancelLargeWithdraw() Tests
    // ============================================

    function test_cancelLargeWithdraw_basic() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.prank(admin);
        treasury.cancelLargeWithdraw(opId);

        // Verify status is Cancelled
        (, , , , Treasury.OpStatus status) = treasury.ops(opId);
        assertTrue(status == Treasury.OpStatus.Cancelled);
    }

    function test_cancelLargeWithdraw_preventsExecution() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.prank(admin);
        treasury.cancelLargeWithdraw(opId);

        vm.warp(block.timestamp + 24 hours);

        // Try to execute cancelled op - should fail
        vm.prank(admin);
        vm.expectRevert(Treasury.OpInvalid.selector);
        treasury.executeLargeWithdraw(opId);
    }

    function test_cancelLargeWithdraw_revertsOnNonAdmin() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.prank(alice);
        vm.expectRevert();
        treasury.cancelLargeWithdraw(opId);
    }

    function test_cancelLargeWithdraw_revertsOnAlreadyCancelled() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        vm.prank(admin);
        treasury.cancelLargeWithdraw(opId);

        // Try to cancel again - should fail
        vm.prank(admin);
        vm.expectRevert(Treasury.OpInvalid.selector);
        treasury.cancelLargeWithdraw(opId);
    }

    // ============================================
    // setDailyLimit() Tests
    // ============================================

    function test_setDailyLimit_basic() public {
        uint256 newLimit = 200_000e6;

        vm.prank(admin);
        treasury.setDailyLimit(newLimit);

        assertEq(treasury.dailyWithdrawLimit(), newLimit);
    }

    function test_setDailyLimit_canSetToZero() public {
        vm.prank(admin);
        treasury.setDailyLimit(0);

        assertEq(treasury.dailyWithdrawLimit(), 0);

        // Regular withdrawals should now fail
        vm.prank(withdrawer);
        vm.expectRevert(Treasury.LimitExceeded.selector);
        treasury.withdraw(address(usdc), alice, 1e6);
    }

    function test_setDailyLimit_revertsAboveMax() public {
        // MAX_DAILY_LIMIT = 5_000_000e6
        vm.prank(admin);
        vm.expectRevert(Treasury.BadAmount.selector);
        treasury.setDailyLimit(5_000_001e6);
    }

    function test_setDailyLimit_revertsOnNonAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        treasury.setDailyLimit(200_000e6);
    }

    // ============================================
    // Event Tests
    // ============================================

    function test_withdraw_emitsEvent() public {
        uint256 amount = 10_000e6;

        vm.prank(withdrawer);
        vm.expectEmit(true, true, false, true);
        emit Treasury.Withdraw(address(usdc), alice, amount);
        treasury.withdraw(address(usdc), alice, amount);
    }

    function test_scheduleLargeWithdraw_emitsEvent() public {
        uint256 amount = 500_000e6;

        vm.prank(admin);
        vm.recordLogs();
        treasury.scheduleLargeWithdraw(address(usdc), alice, amount);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found = false;
        bytes32 topic0 = keccak256("LargeWithdrawScheduled(bytes32,address,address,uint256,uint256)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == topic0) {
                found = true;
                break;
            }
        }
        assertTrue(found, "LargeWithdrawScheduled event not found");
    }

    function test_cancelLargeWithdraw_emitsEvent() public {
        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, 500_000e6);

        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit Treasury.LargeWithdrawCancelled(opId);
        treasury.cancelLargeWithdraw(opId);
    }

    function test_executeLargeWithdraw_emitsEvents() public {
        vm.prank(admin);
        bytes32 opId = treasury.scheduleLargeWithdraw(address(usdc), alice, 500_000e6);

        vm.warp(block.timestamp + 24 hours);

        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit Treasury.LargeWithdrawExecuted(opId);
        treasury.executeLargeWithdraw(opId);
    }

    function test_setDailyLimit_emitsEvent() public {
        uint256 newLimit = 200_000e6;

        vm.prank(admin);
        vm.expectEmit(false, false, false, true);
        emit Treasury.DailyLimitUpdated(INITIAL_DAILY_LIMIT, newLimit);
        treasury.setDailyLimit(newLimit);
    }
}
