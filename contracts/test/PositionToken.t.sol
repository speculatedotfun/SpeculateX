// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {PositionToken} from "../src/PositionToken.sol";

contract PositionTokenTest is Test {
    PositionToken internal token;

    address internal core = address(this); // Test contract acts as core
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal unauthorized = address(0xBAD);

    function setUp() public {
        token = new PositionToken("YES Token", "YES", core);
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_constructor_setsCorrectName() public view {
        assertEq(token.name(), "YES Token");
    }

    function test_constructor_setsCorrectSymbol() public view {
        assertEq(token.symbol(), "YES");
    }

    function test_constructor_grantsRolesToCore() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), core));
        assertTrue(token.hasRole(token.MINTER_ROLE(), core));
        assertTrue(token.hasRole(token.BURNER_ROLE(), core));
    }

    function test_constructor_revertsOnZeroCore() public {
        vm.expectRevert(PositionToken.ZeroAddress.selector);
        new PositionToken("Test", "TST", address(0));
    }

    // ============================================
    // mint() Tests
    // ============================================

    function test_mint_basic() public {
        uint256 amount = 1000e18;

        token.mint(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_mint_toMultipleAddresses() public {
        token.mint(alice, 1000e18);
        token.mint(bob, 2000e18);

        assertEq(token.balanceOf(alice), 1000e18);
        assertEq(token.balanceOf(bob), 2000e18);
        assertEq(token.totalSupply(), 3000e18);
    }

    function test_mint_revertsOnZeroAddress() public {
        vm.expectRevert(PositionToken.ZeroAddress.selector);
        token.mint(address(0), 1000e18);
    }

    function test_mint_revertsOnZeroAmount() public {
        vm.expectRevert(PositionToken.BadAmount.selector);
        token.mint(alice, 0);
    }

    function test_mint_revertsOnUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        token.mint(alice, 1000e18);
    }

    function test_mint_worksWithGrantedRole() public {
        // Grant minter role to alice
        token.grantRole(token.MINTER_ROLE(), alice);

        vm.prank(alice);
        token.mint(bob, 1000e18);

        assertEq(token.balanceOf(bob), 1000e18);
    }

    // ============================================
    // burn() Tests
    // ============================================

    function test_burn_basic() public {
        // First mint
        token.mint(alice, 1000e18);

        // Then burn
        token.burn(alice, 500e18);

        assertEq(token.balanceOf(alice), 500e18);
        assertEq(token.totalSupply(), 500e18);
    }

    function test_burn_fullBalance() public {
        token.mint(alice, 1000e18);
        token.burn(alice, 1000e18);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.totalSupply(), 0);
    }

    function test_burn_revertsOnZeroAddress() public {
        vm.expectRevert(PositionToken.ZeroAddress.selector);
        token.burn(address(0), 1000e18);
    }

    function test_burn_revertsOnZeroAmount() public {
        token.mint(alice, 1000e18);

        vm.expectRevert(PositionToken.BadAmount.selector);
        token.burn(alice, 0);
    }

    function test_burn_revertsOnUnauthorized() public {
        token.mint(alice, 1000e18);

        vm.prank(unauthorized);
        vm.expectRevert();
        token.burn(alice, 500e18);
    }

    function test_burn_revertsOnInsufficientBalance() public {
        token.mint(alice, 1000e18);

        vm.expectRevert();
        token.burn(alice, 2000e18);
    }

    function test_burn_worksWithGrantedRole() public {
        token.mint(alice, 1000e18);

        // Grant burner role to bob
        token.grantRole(token.BURNER_ROLE(), bob);

        vm.prank(bob);
        token.burn(alice, 500e18);

        assertEq(token.balanceOf(alice), 500e18);
    }

    // ============================================
    // ERC20 Standard Tests
    // ============================================

    function test_transfer_basic() public {
        token.mint(alice, 1000e18);

        vm.prank(alice);
        token.transfer(bob, 300e18);

        assertEq(token.balanceOf(alice), 700e18);
        assertEq(token.balanceOf(bob), 300e18);
    }

    function test_transferFrom_withApproval() public {
        token.mint(alice, 1000e18);

        vm.prank(alice);
        token.approve(bob, 500e18);

        vm.prank(bob);
        token.transferFrom(alice, bob, 300e18);

        assertEq(token.balanceOf(alice), 700e18);
        assertEq(token.balanceOf(bob), 300e18);
        assertEq(token.allowance(alice, bob), 200e18);
    }

    function test_approve_basic() public {
        vm.prank(alice);
        token.approve(bob, 1000e18);

        assertEq(token.allowance(alice, bob), 1000e18);
    }

    function test_decimals_returns18() public view {
        assertEq(token.decimals(), 18);
    }

    // ============================================
    // Role Management Tests
    // ============================================

    function test_grantRole_onlyAdmin() public {
        // Core (this contract) is admin
        token.grantRole(token.MINTER_ROLE(), alice);
        assertTrue(token.hasRole(token.MINTER_ROLE(), alice));
    }

    function test_revokeRole_onlyAdmin() public {
        token.grantRole(token.MINTER_ROLE(), alice);
        token.revokeRole(token.MINTER_ROLE(), alice);
        assertFalse(token.hasRole(token.MINTER_ROLE(), alice));
    }

    function test_grantRole_revertsOnNonAdmin() public {
        // OpenZeppelin AccessControl reverts when non-admin tries to grant role
        // The error format depends on OZ version - just check it reverts
        bytes32 minterRole = token.MINTER_ROLE();
        bytes32 adminRoleForMinter = token.getRoleAdmin(minterRole);

        // unauthorized doesn't have the admin role for MINTER_ROLE
        assertFalse(token.hasRole(adminRoleForMinter, unauthorized), "unauthorized should not have admin role");

        vm.prank(unauthorized);
        // OpenZeppelin 5.x uses AccessControlUnauthorizedAccount error
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                unauthorized,
                adminRoleForMinter
            )
        );
        token.grantRole(minterRole, alice);
    }

    // ============================================
    // Fuzz Tests
    // ============================================

    function testFuzz_mint_anyAmount(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount < type(uint256).max / 2); // Avoid overflow

        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_burn_anyAmount(uint256 mintAmount, uint256 burnAmount) public {
        vm.assume(mintAmount > 0);
        vm.assume(burnAmount > 0);
        vm.assume(burnAmount <= mintAmount);

        token.mint(alice, mintAmount);
        token.burn(alice, burnAmount);

        assertEq(token.balanceOf(alice), mintAmount - burnAmount);
    }

    function testFuzz_transfer_anyAmount(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount < type(uint256).max / 2);

        token.mint(alice, amount);

        vm.prank(alice);
        token.transfer(bob, amount);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(bob), amount);
    }
}
