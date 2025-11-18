// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

contract TreasuryTest is BaseTest {
    function test_Withdraw() public {
        // Send some USDC to treasury
        uint256 amount = 1000e6;
        vm.prank(admin);
        usdc.transfer(address(treasury), amount);

        assertEq(usdc.balanceOf(address(treasury)), amount);

        // Withdraw as admin
        uint256 adminBalanceBefore = usdc.balanceOf(admin);
        vm.prank(admin);
        treasury.withdraw(address(usdc), admin, amount);

        assertEq(usdc.balanceOf(address(treasury)), 0);
        assertEq(usdc.balanceOf(admin), adminBalanceBefore + amount);
    }

    function test_WithdrawNotOwner() public {
        // Send some USDC to treasury
        uint256 amount = 1000e6;
        vm.prank(admin);
        usdc.transfer(address(treasury), amount);

        // Try to withdraw as non-owner
        vm.prank(trader1);
        vm.expectRevert();
        treasury.withdraw(address(usdc), admin, amount);
    }

    function test_WithdrawZeroAmount() public {
        vm.prank(admin);
        treasury.withdraw(address(usdc), admin, 0);
    }
}
