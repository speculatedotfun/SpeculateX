// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CoreStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Diamond-style router that delegatecalls into facets.
/// @dev IMPORTANT: `CoreStorage` MUST be the first base contract so its storage layout
///      starts at slot 0 for both the router and all facets (which inherit `CoreStorage`).
contract SpeculateCoreRouter is CoreStorage, AccessControl {
    event FacetSet(bytes4 indexed selector, address indexed facet);
    event FacetRemoved(bytes4 indexed selector);
    event TreasuryUpdated(address indexed treasury);
    event ResolverUpdated(address indexed resolver);

    error ZeroAddress();
    error BadValue();
    error TagMismatch_(); // Renamed to avoid collision with CoreStorage if any
    error DataMismatch_();
    error NotAContract(address addr);
    error Paused();
    error NoFacet();

    uint256 public constant ABSOLUTE_MIN_DELAY = 0; // TESTNET ONLY!
    
    // Settlement function selectors (whitelisted during pause)
    bytes4 private constant RESOLVE_MARKET_SELECTOR = bytes4(keccak256("resolveMarketWithPrice(uint256,uint256)"));
    bytes4 private constant CANCEL_MARKET_SELECTOR = bytes4(keccak256("emergencyCancelMarket(bytes32,uint256)"));
    bytes4 private constant REDEEM_SELECTOR        = bytes4(keccak256("redeem(uint256,bool)"));
    bytes4 private constant CLAIM_LP_FEES_SELECTOR = bytes4(keccak256("claimLpFees(uint256)"));
    bytes4 private constant CLAIM_LP_RESID_SELECTOR= bytes4(keccak256("claimLpResidual(uint256)"));

    constructor(address admin, address usdc_, address treasury_, uint256 minTimelockDelay_) {
        if (admin == address(0) || usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (minTimelockDelay_ < ABSOLUTE_MIN_DELAY) revert BadValue();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARKET_CREATOR_ROLE, admin);

        usdc = usdc_;
        treasury = treasury_;
        minTimelockDelay = minTimelockDelay_;

        maxUsdcPerTrade = 100_000e6;
        minMarketSeed   = 500e6;
        minLiquidityAdd = 500e6;
        dustSharesE18   = 1e12;
        liquidityMultiplierE18 = 1e18;
        maxInstantJumpE18 = 15e16;

        defaultFeeTreasuryBps = 100;
        defaultFeeLpBps       = 100;
        defaultFeeVaultBps    = 0;
    }

    function scheduleOp(bytes32 tag, bytes calldata data)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bytes32 opId)
    {
        uint256 nonce_ = ++opNonce;
        bytes32 dataHash_ = keccak256(data);
        opId = keccak256(abi.encode("CORE_OP_V1", tag, dataHash_, nonce_));

        require(ops[opId].status == OpStatus.None, "OpInvalid");

        ops[opId] = Op({
            tag: tag,
            dataHash: dataHash_,
            readyAt: block.timestamp + minTimelockDelay,
            status: OpStatus.Scheduled
        });

        emit OperationScheduled(opId, tag, ops[opId].readyAt);
    }

    function cancelOp(bytes32 opId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        op.status = OpStatus.Cancelled;
        emit OperationCancelled(opId);
    }

    function executeSetFacet(bytes32 opId, bytes4 selector, address facet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (facet == address(0)) revert ZeroAddress();
        if (facet.code.length == 0) revert NotAContract(facet);
        bytes memory data = abi.encode(selector, facet);
        _consume(opId, OP_SET_FACET, data);
        facetOf[selector] = facet;
        emit FacetSet(selector, facet);
    }

    function executeRemoveFacet(bytes32 opId, bytes4 selector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes memory data = abi.encode(selector);
        _consume(opId, OP_REMOVE_FACET, data);
        facetOf[selector] = address(0);
        emit FacetRemoved(selector);
    }

    function executeSetTreasury(bytes32 opId, address newTreasury)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newTreasury == address(0)) revert ZeroAddress();
        if (newTreasury.code.length == 0) revert NotAContract(newTreasury);
        bytes memory data = abi.encode(newTreasury);
        _consume(opId, OP_SET_TREASURY, data);
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function executeSetResolver(bytes32 opId, address newResolver)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newResolver != address(0) && newResolver.code.length == 0) revert NotAContract(newResolver);
        bytes memory data = abi.encode(newResolver);
        _consume(opId, OP_SET_RESOLVER, data);
        chainlinkResolver = newResolver;
        emit ResolverUpdated(newResolver);
    }

    function executePause(bytes32 opId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _consume(opId, OP_PAUSE, "");
        _paused = true;
    }

    function executeUnpause(bytes32 opId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _consume(opId, OP_UNPAUSE, "");
        _paused = false;
    }

    function executeRecoverETH(bytes32 opId, address payable to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes memory data = abi.encode(to);
        _consume(opId, OP_RECOVER_ETH, data);
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "TRANSFER_FAILED");
    }

    fallback() external payable {
        bytes4 selector = msg.sig;
        // Whitelist settlement functions to allow resolution even when paused
        // This ensures markets can be resolved during emergencies
        if (_paused) {
            if (
                selector != RESOLVE_MARKET_SELECTOR &&
                selector != CANCEL_MARKET_SELECTOR &&
                selector != REDEEM_SELECTOR &&
                selector != CLAIM_LP_FEES_SELECTOR &&
                selector != CLAIM_LP_RESID_SELECTOR
            ) {
                revert Paused();
            }
        }
        address facet = facetOf[selector];
        if (facet == address(0)) revert NoFacet();

        assembly ("memory-safe") {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
        revert("NO_ETH");
    }
}
