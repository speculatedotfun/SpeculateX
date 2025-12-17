// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Treasury} from "../src/Treasury.sol";

contract RouterTimelockTest is Test {
    SpeculateCoreRouter internal core;
    MockUSDC internal usdc;
    Treasury internal treasury;

    function setUp() public {
        treasury = new Treasury(address(this), 20_000e6);
        usdc = new MockUSDC(address(this));
        core = new SpeculateCoreRouter(address(this), address(usdc), address(treasury), 24 hours);
    }

    function test_executeSetFacet_revertsBeforeDelay() public {
        bytes4 selector = bytes4(keccak256("foo()"));
        address facet = address(0x1234);

        bytes32 opId = core.scheduleOp(core.OP_SET_FACET(), abi.encode(selector, facet));

        // revert strings are stripped in foundry.toml, so we only assert "reverts"
        vm.expectRevert();
        core.executeSetFacet(opId, selector, facet);
    }

    function test_cancelOp_blocksExecution() public {
        bytes4 selector = bytes4(keccak256("foo()"));
        address facet = address(0x1234);

        bytes32 opId = core.scheduleOp(core.OP_SET_FACET(), abi.encode(selector, facet));
        core.cancelOp(opId);

        vm.warp(block.timestamp + core.minTimelockDelay());
        // executeSetFacet uses require("OpInvalid"), which is stripped -> empty revert data
        vm.expectRevert();
        core.executeSetFacet(opId, selector, facet);
    }

    function test_executeSetFacet_revertsOnDataMismatch() public {
        bytes4 selector = bytes4(keccak256("foo()"));
        address facet = address(0x1234);

        bytes32 opId = core.scheduleOp(core.OP_SET_FACET(), abi.encode(selector, facet));
        vm.warp(block.timestamp + core.minTimelockDelay());

        vm.expectRevert();
        core.executeSetFacet(opId, selector, address(0xBEEF));
    }

    function test_executeSetFacet_revertsOnTagMismatch() public {
        bytes4 selector = bytes4(keccak256("foo()"));
        address facet = address(0x1234);

        // Schedule as SET_RESOLVER, but try to execute as SET_FACET.
        bytes32 opId = core.scheduleOp(core.OP_SET_RESOLVER(), abi.encode(facet));
        vm.warp(block.timestamp + core.minTimelockDelay());

        vm.expectRevert();
        core.executeSetFacet(opId, selector, facet);
    }

    function test_executeSetFacet_cannotExecuteTwice() public {
        bytes4 selector = bytes4(keccak256("foo()"));
        address facet = address(0x1234);

        bytes32 opId = core.scheduleOp(core.OP_SET_FACET(), abi.encode(selector, facet));
        vm.warp(block.timestamp + core.minTimelockDelay());

        core.executeSetFacet(opId, selector, facet);
        vm.expectRevert();
        core.executeSetFacet(opId, selector, facet);
    }
}


