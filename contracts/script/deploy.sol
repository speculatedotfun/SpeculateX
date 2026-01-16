// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {AdminFacet} from "../src/facets/AdminFacet.sol";

import {MockUSDC} from "../src/MockUSDC.sol";
import {Treasury} from "../src/Treasury.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract DeploySpeculateX is Script {
    // Env-driven (safe for mainnet):
    // - PRIVATE_KEY: deployer key (must have BNB for gas)
    // - ADMIN_ADDRESS: multisig/owner (recommended; defaults to deployer if omitted)
    // - USDC_ADDRESS: real USDC for mainnet (required unless DEPLOY_MOCK_USDC=true)
    // - USDC_DECIMALS: token decimals (default 6 for mock, 18 for mainnet)
    // - DEPLOY_MOCK_USDC: "true" to deploy MockUSDC (testnet/local only)
    // - CORE_TIMELOCK_DELAY: seconds (default 24h on mainnet, 0 on testnets)
    // - TREASURY_DAILY_LIMIT: uint (default 50_000e6)
    //
    // NOTE: On BSC mainnet (chainId=56) the router enforces minTimelockDelay >= 24h.

    function run() public {
        // Support both PRIVATE_KEY_MAIN (preferred) and PRIVATE_KEY (legacy)
        string memory pkStr;
        try vm.envString("PRIVATE_KEY_MAIN") returns (string memory s) {
            pkStr = s;
        } catch {
            pkStr = vm.envString("PRIVATE_KEY");
        }
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }
        address deployer = vm.addr(pk);
        // Final admin (recommended: multisig). Required on BSC mainnet.
        address finalAdmin = deployer;
        if (block.chainid == 56) {
            finalAdmin = vm.envAddress("ADMIN_ADDRESS");
            require(finalAdmin != address(0), "ADMIN_ADDRESS required");
        } else {
            finalAdmin = vm.envOr("ADMIN_ADDRESS", deployer);
        }
        // Deployer is the temporary admin for deployment + scheduling.
        address tempAdmin = deployer;
        // If true, revoke deployer roles at the end (recommended for mainnet if finalAdmin is a multisig).
        bool renounceDeployer = vm.envOr("RENOUNCE_DEPLOYER", block.chainid == 56);

        bool deployMock = vm.envOr("DEPLOY_MOCK_USDC", false);
        uint256 defaultDelay = block.chainid == 56 ? 24 hours : 0; // 24h for mainnet, 0 for testnet
        uint256 timelockDelay = vm.envOr("CORE_TIMELOCK_DELAY", defaultDelay);
        uint256 usdcDecimalsRaw = vm.envOr("USDC_DECIMALS", uint256(deployMock ? 6 : 18));
        if (usdcDecimalsRaw > type(uint8).max) revert("USDC_DECIMALS too large");
        uint8 usdcDecimals = uint8(usdcDecimalsRaw);
        uint256 unit = 10 ** uint256(usdcDecimals);
        uint256 treasuryDailyLimit = vm.envOr("TREASURY_DAILY_LIMIT", uint256(50_000 * unit));

        vm.startBroadcast(pk);

        console.log("=== SPECULATEX DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("TempAdmin (during deploy):", tempAdmin);
        console.log("FinalAdmin:", finalAdmin);
        console.log("chainId:", block.chainid);
        console.log("TimelockDelay:", timelockDelay);
        console.log("Deploy MockUSDC:", deployMock);
        console.log("");

        // ============ Deploy ============
        Treasury treasury = new Treasury(tempAdmin, treasuryDailyLimit, usdcDecimals);
        console.log("Treasury:", address(treasury));

        address usdcAddr;
        if (deployMock) {
            MockUSDC mock = new MockUSDC(tempAdmin);
            usdcAddr = address(mock);
            console.log("MockUSDC:", usdcAddr);
        } else {
            usdcAddr = vm.envAddress("USDC_ADDRESS");
            console.log("USDC:", usdcAddr);
        }

        SpeculateCoreRouter core = new SpeculateCoreRouter(
            tempAdmin, usdcAddr, usdcDecimals, address(treasury), timelockDelay
        );
        console.log("Core Router:", address(core));

        ChainlinkResolver resolver = new ChainlinkResolver(tempAdmin, address(core));
        console.log("Resolver:", address(resolver));

        MarketFacet marketFacet = new MarketFacet();
        TradingFacet tradingFacet = new TradingFacet();
        LiquidityFacet liquidityFacet = new LiquidityFacet();
        SettlementFacet settlementFacet = new SettlementFacet();
        AdminFacet adminFacet = new AdminFacet();
        
        console.log("MarketFacet:", address(marketFacet));
        console.log("TradingFacet:", address(tradingFacet));
        console.log("LiquidityFacet:", address(liquidityFacet));
        console.log("SettlementFacet:", address(settlementFacet));
        console.log("AdminFacet:", address(adminFacet));

        // ============ Schedule & Execute ============
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");

        // Resolver
        bytes32 opResolver = core.scheduleOp(OP_SET_RESOLVER, abi.encode(address(resolver)));

        // MarketFacet
        bytes32 op1 = _schedule(core, OP_SET_FACET, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
        bytes32 op1b = _schedule(core, OP_SET_FACET, "createScheduledMarket(string,string,string,string,string,uint256,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
        bytes32 op2 = _schedule(core, OP_SET_FACET, "getMarketState(uint256)", address(marketFacet));
        bytes32 op3 = _schedule(core, OP_SET_FACET, "getMarketResolution(uint256)", address(marketFacet));
        bytes32 op4 = _schedule(core, OP_SET_FACET, "getMarketQuestion(uint256)", address(marketFacet));
        bytes32 op5 = _schedule(core, OP_SET_FACET, "getMarketInvariants(uint256)", address(marketFacet));
        bytes32 op5b = _schedule(core, OP_SET_FACET, "getMarketTokens(uint256)", address(marketFacet));

        // TradingFacet
        bytes32 op6 = _schedule(core, OP_SET_FACET, "spotPriceYesE18(uint256)", address(tradingFacet));
        bytes32 op7 = _schedule(core, OP_SET_FACET, "spotPriceYesE6(uint256)", address(tradingFacet));
        bytes32 op8 = _schedule(core, OP_SET_FACET, "getMaxJumpE18(uint256)", address(tradingFacet));
        bytes32 op9 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256)", address(tradingFacet));
        bytes32 op10 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256)", address(tradingFacet));
        bytes32 op11 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));
        bytes32 op12 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));

        // LiquidityFacet
        bytes32 op13 = _schedule(core, OP_SET_FACET, "addLiquidity(uint256,uint256)", address(liquidityFacet));
        bytes32 op14 = _schedule(core, OP_SET_FACET, "removeLiquidity(uint256,uint256)", address(liquidityFacet));
        bytes32 op15 = _schedule(core, OP_SET_FACET, "claimLpFees(uint256)", address(liquidityFacet));

        // SettlementFacet
        bytes32 op16 = _schedule(core, OP_SET_FACET, "resolveMarketWithPrice(uint256,uint256)", address(settlementFacet));
        bytes32 op17 = _schedule(core, OP_SET_FACET, "emergencyCancelMarket(bytes32,uint256)", address(settlementFacet));
        bytes32 op18 = _schedule(core, OP_SET_FACET, "redeem(uint256,bool)", address(settlementFacet));
        bytes32 op19 = _schedule(core, OP_SET_FACET, "pendingLpResidual(uint256,address)", address(settlementFacet));
        bytes32 op20 = _schedule(core, OP_SET_FACET, "claimLpResidual(uint256)", address(settlementFacet));

        // AdminFacet
        bytes32 op21 = _schedule(core, OP_SET_FACET, "executeSetUsdc(bytes32,address,uint8)", address(adminFacet));
        bytes32 op22 = _schedule(core, OP_SET_FACET, "executeSetLimits(bytes32,uint256,uint256,uint256)", address(adminFacet));
        bytes32 op23 = _schedule(core, OP_SET_FACET, "executeSetFees(bytes32,uint16,uint16,uint16)", address(adminFacet));
        bytes32 op24 = _schedule(core, OP_SET_FACET, "executeSetPriceBandThreshold(bytes32,uint256)", address(adminFacet));
        bytes32 op25 = _schedule(core, OP_SET_FACET, "executeSetMaxInstantJump(bytes32,uint256)", address(adminFacet));
        bytes32 op26 = _schedule(core, OP_SET_FACET, "executeSetLpFeeCooldown(bytes32,uint256)", address(adminFacet));

        console.log("Scheduled operations (opIds):");
        console.logBytes32(opResolver);
        console.logBytes32(op1);
        console.logBytes32(op1b);
        console.logBytes32(op2);
        console.logBytes32(op3);
        console.logBytes32(op4);
        console.logBytes32(op5);
        console.logBytes32(op5b);
        console.logBytes32(op6);
        console.logBytes32(op7);
        console.logBytes32(op8);
        console.logBytes32(op9);
        console.logBytes32(op10);
        console.logBytes32(op11);
        console.logBytes32(op12);
        console.logBytes32(op13);
        console.logBytes32(op14);
        console.logBytes32(op15);
        console.logBytes32(op16);
        console.logBytes32(op17);
        console.logBytes32(op18);
        console.logBytes32(op19);
        console.logBytes32(op20);
        console.logBytes32(op21);
        console.logBytes32(op22);
        console.logBytes32(op23);
        console.logBytes32(op24);
        console.logBytes32(op25);
        console.logBytes32(op26);

        // Execute immediately if testnet
        if (timelockDelay == 0) {
            console.log("Executing immediately (timelock=0)...");
            
            core.executeSetResolver(opResolver, address(resolver));

            _exec(core, op1, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
            _exec(core, op1b, "createScheduledMarket(string,string,string,string,string,uint256,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
            _exec(core, op2, "getMarketState(uint256)", address(marketFacet));
            _exec(core, op3, "getMarketResolution(uint256)", address(marketFacet));
            _exec(core, op4, "getMarketQuestion(uint256)", address(marketFacet));
            _exec(core, op5, "getMarketInvariants(uint256)", address(marketFacet));
            _exec(core, op5b, "getMarketTokens(uint256)", address(marketFacet));

            _exec(core, op6, "spotPriceYesE18(uint256)", address(tradingFacet));
            _exec(core, op7, "spotPriceYesE6(uint256)", address(tradingFacet));
            _exec(core, op8, "getMaxJumpE18(uint256)", address(tradingFacet));
            _exec(core, op9, "buy(uint256,bool,uint256,uint256)", address(tradingFacet));
            _exec(core, op10, "sell(uint256,bool,uint256,uint256)", address(tradingFacet));
            _exec(core, op11, "buy(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));
            _exec(core, op12, "sell(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));

            _exec(core, op13, "addLiquidity(uint256,uint256)", address(liquidityFacet));
            _exec(core, op14, "removeLiquidity(uint256,uint256)", address(liquidityFacet));
            _exec(core, op15, "claimLpFees(uint256)", address(liquidityFacet));

            _exec(core, op16, "resolveMarketWithPrice(uint256,uint256)", address(settlementFacet));
            _exec(core, op17, "emergencyCancelMarket(bytes32,uint256)", address(settlementFacet));
            _exec(core, op18, "redeem(uint256,bool)", address(settlementFacet));
            _exec(core, op19, "pendingLpResidual(uint256,address)", address(settlementFacet));
            _exec(core, op20, "claimLpResidual(uint256)", address(settlementFacet));
            _exec(core, op21, "executeSetUsdc(bytes32,address,uint8)", address(adminFacet));
            _exec(core, op22, "executeSetLimits(bytes32,uint256,uint256,uint256)", address(adminFacet));
            _exec(core, op23, "executeSetFees(bytes32,uint16,uint16,uint16)", address(adminFacet));
            _exec(core, op24, "executeSetPriceBandThreshold(bytes32,uint256)", address(adminFacet));
            _exec(core, op25, "executeSetMaxInstantJump(bytes32,uint256)", address(adminFacet));
            _exec(core, op26, "executeSetLpFeeCooldown(bytes32,uint256)", address(adminFacet));

            console.log("All operations executed!");
        }

        // ==== Transfer admin roles to finalAdmin ====
        if (finalAdmin != tempAdmin) {
            // Router roles
            core.grantRole(core.DEFAULT_ADMIN_ROLE(), finalAdmin);
            core.grantRole(core.MARKET_CREATOR_ROLE(), finalAdmin);

            // Treasury roles
            treasury.grantRole(treasury.DEFAULT_ADMIN_ROLE(), finalAdmin);
            treasury.grantRole(treasury.ADMIN_ROLE(), finalAdmin);
            treasury.grantRole(treasury.WITHDRAWER_ROLE(), finalAdmin);

            // Resolver roles
            resolver.grantRole(resolver.DEFAULT_ADMIN_ROLE(), finalAdmin);
            resolver.grantRole(resolver.ADMIN_ROLE(), finalAdmin);

            console.log("Granted roles to FinalAdmin:", finalAdmin);
        }

        if (renounceDeployer && finalAdmin != tempAdmin) {
            // Router renounce
            core.renounceRole(core.DEFAULT_ADMIN_ROLE(), tempAdmin);
            core.renounceRole(core.MARKET_CREATOR_ROLE(), tempAdmin);

            // Treasury renounce
            treasury.renounceRole(treasury.DEFAULT_ADMIN_ROLE(), tempAdmin);
            treasury.renounceRole(treasury.ADMIN_ROLE(), tempAdmin);
            treasury.renounceRole(treasury.WITHDRAWER_ROLE(), tempAdmin);

            // Resolver renounce
            resolver.renounceRole(resolver.DEFAULT_ADMIN_ROLE(), tempAdmin);
            resolver.renounceRole(resolver.ADMIN_ROLE(), tempAdmin);

            console.log("Renounced deployer roles; FinalAdmin is now sole admin.");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Treasury:       ", address(treasury));
        console.log("USDC:           ", usdcAddr);
        console.log("Core:           ", address(core));
        console.log("Resolver:       ", address(resolver));
    }

    function _schedule(SpeculateCoreRouter core, bytes32 tag, string memory sig, address facet) 
        internal returns (bytes32) 
    {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        return core.scheduleOp(tag, abi.encode(selector, facet));
    }

    function _exec(SpeculateCoreRouter core, bytes32 opId, string memory sig, address facet) internal {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        core.executeSetFacet(opId, selector, facet);
    }
}