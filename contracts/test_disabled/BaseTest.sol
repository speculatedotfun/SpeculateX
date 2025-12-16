// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/SpeculateCore.sol";
import "../src/ChainlinkResolver.sol";
import "../src/Treasury.sol";

contract BaseTest is Test {
    // Contracts
    MockUSDC internal usdc;
    SpeculateCore internal core;
    ChainlinkResolver internal resolver;
    Treasury internal treasury;

    // Test accounts
    address internal admin = address(0x1337);
    address internal marketCreator = address(0x42);
    address internal trader1 = address(0x111);
    address internal trader2 = address(0x222);
    address internal liquidityProvider = address(0x333);

    // Common test values
    uint256 internal constant INITIAL_USDC = 1_000_000e6; // 1M USDC
    uint256 internal constant MARKET_SEED = 100e6; // 100 USDC minimum
    uint256 internal constant LIQUIDITY_ADD = 1000e6; // 1000 USDC

    function setUp() public virtual {
        // Deploy contracts as admin
        vm.startPrank(admin);
        usdc = new MockUSDC();
        treasury = new Treasury(admin);
        core = new SpeculateCore(address(usdc), address(treasury));
        resolver = new ChainlinkResolver(address(core));

        // Admin already has roles from constructor, grant market creator role
        core.grantRole(core.MARKET_CREATOR_ROLE(), marketCreator);
        // Schedule resolver set on core (requires timelock)
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 opId = core.scheduleOp(OP_SET_RESOLVER, abi.encode(address(resolver)));
        vm.warp(block.timestamp + 24 hours + 1);
        core.executeSetResolver(opId, address(resolver));

        // Set SpeculateCore address on USDC for minting authorization
        usdc.setSpeculateCore(address(core));

        // Fund test accounts (admin can mint as owner)
        usdc.mint(admin, INITIAL_USDC);
        usdc.mint(marketCreator, INITIAL_USDC);
        usdc.mint(trader1, INITIAL_USDC);
        usdc.mint(trader2, INITIAL_USDC);
        usdc.mint(liquidityProvider, INITIAL_USDC);
        vm.stopPrank();

        // Approve core to spend tokens
        vm.prank(admin);
        usdc.approve(address(core), type(uint256).max);
        vm.prank(marketCreator);
        usdc.approve(address(core), type(uint256).max);
        vm.prank(trader1);
        usdc.approve(address(core), type(uint256).max);
        vm.prank(trader2);
        usdc.approve(address(core), type(uint256).max);
        vm.prank(liquidityProvider);
        usdc.approve(address(core), type(uint256).max);
    }

    // Helper functions
    function createTestMarket() internal returns (uint256 marketId) {
        vm.prank(marketCreator);
        marketId = core.createMarket(
            "Will BTC hit $100k?",
            "YES", "YES",
            "NO", "NO",
            MARKET_SEED,
            block.timestamp + 30 days,
            address(0),
            "",
            100_000e6, // target: $100k
            SpeculateCore.Comparison.Above
        );
    }

    function createTestMarketWithLiquidity() internal returns (uint256 marketId) {
        marketId = createTestMarket();

        vm.prank(liquidityProvider);
        core.addLiquidity(marketId, LIQUIDITY_ADD);
    }


    function assertApproxEq(uint256 a, uint256 b, uint256 tolerance) internal pure {
        if (a > b) {
            require(a - b <= tolerance, "a > b by more than tolerance");
        } else {
            require(b - a <= tolerance, "b > a by more than tolerance");
        }
    }
}
