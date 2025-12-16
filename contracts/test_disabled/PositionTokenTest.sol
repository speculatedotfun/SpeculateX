// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

contract PositionTokenTest is BaseTest {
    PositionToken internal yesToken;
    PositionToken internal noToken;

    function setUp() public override {
        super.setUp();

        // Create tokens directly for testing
        yesToken = new PositionToken("YES Token", "YES", address(this));
        noToken = new PositionToken("NO Token", "NO", address(this));

        // Grant minting permissions to this test contract
        yesToken.grantRole(yesToken.MINTER_ROLE(), address(this));
        yesToken.grantRole(yesToken.BURNER_ROLE(), address(this));
        noToken.grantRole(noToken.MINTER_ROLE(), address(this));
        noToken.grantRole(noToken.BURNER_ROLE(), address(this));
    }

    function test_TokenDeployment() public {
        assertEq(yesToken.name(), "YES Token");
        assertEq(yesToken.symbol(), "YES");
        assertEq(yesToken.decimals(), 18);

        assertEq(noToken.name(), "NO Token");
        assertEq(noToken.symbol(), "NO");
        assertEq(noToken.decimals(), 18);
    }

    function test_MintBurnAccess() public {
        // Only authorized minters should be able to mint/burn
        vm.prank(trader1);
        vm.expectRevert();
        yesToken.mint(trader1, 100e18);

        vm.prank(trader1);
        vm.expectRevert();
        yesToken.burn(trader1, 100e18);

        // This test contract should be able to mint/burn
        yesToken.mint(trader1, 100e18);
        assertEq(yesToken.balanceOf(trader1), 100e18);

        yesToken.burn(trader1, 50e18);
        assertEq(yesToken.balanceOf(trader1), 50e18);
    }

    function test_Transfer() public {
        // Mint some tokens
        yesToken.mint(trader1, 100e18);

        // Transfer
        vm.prank(trader1);
        yesToken.transfer(trader2, 50e18);

        assertEq(yesToken.balanceOf(trader1), 50e18);
        assertEq(yesToken.balanceOf(trader2), 50e18);
    }

    function test_ApproveAndTransferFrom() public {
        // Mint some tokens
        yesToken.mint(trader1, 100e18);

        // Approve
        vm.prank(trader1);
        yesToken.approve(trader2, 50e18);

        assertEq(yesToken.allowance(trader1, trader2), 50e18);

        // Transfer from
        vm.prank(trader2);
        yesToken.transferFrom(trader1, trader2, 30e18);

        assertEq(yesToken.balanceOf(trader1), 70e18);
        assertEq(yesToken.balanceOf(trader2), 30e18);
        assertEq(yesToken.allowance(trader1, trader2), 20e18);
    }

    function test_IncreaseAllowance() public {
        vm.prank(trader1);
        yesToken.approve(trader2, 50e18);
        assertEq(yesToken.allowance(trader1, trader2), 50e18);

        // Approve more
        vm.prank(trader1);
        yesToken.approve(trader2, 75e18);
        assertEq(yesToken.allowance(trader1, trader2), 75e18);
    }

    function test_TotalSupply() public {
        assertEq(yesToken.totalSupply(), 0);

        yesToken.mint(trader1, 100e18);
        assertEq(yesToken.totalSupply(), 100e18);

        yesToken.mint(trader2, 50e18);
        assertEq(yesToken.totalSupply(), 150e18);

        yesToken.burn(trader1, 25e18);
        assertEq(yesToken.totalSupply(), 125e18);
    }

    function test_BurnMoreThanBalance() public {
        yesToken.mint(trader1, 100e18);

        vm.expectRevert();
        yesToken.burn(trader1, 200e18);
    }

    function test_TransferMoreThanBalance() public {
        yesToken.mint(trader1, 100e18);

        vm.prank(trader1);
        vm.expectRevert();
        yesToken.transfer(trader2, 200e18);
    }

    function test_TransferFromMoreThanAllowance() public {
        yesToken.mint(trader1, 100e18);

        vm.prank(trader1);
        yesToken.approve(trader2, 50e18);

        vm.prank(trader2);
        vm.expectRevert();
        yesToken.transferFrom(trader1, trader2, 75e18);
    }
}
