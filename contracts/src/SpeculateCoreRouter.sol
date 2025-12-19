// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CoreStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Diamond-style router that delegatecalls into facets.
/// @dev IMPORTANT: `CoreStorage` MUST be the first base contract so its storage layout
///      starts at slot 0 for both the router and all facets (which inherit `CoreStorage`).
contract SpeculateCoreRouter is CoreStorage, AccessControl {
    event OperationScheduled(bytes32 indexed opId, bytes32 indexed tag, uint256 readyAt);
    event OperationExecuted(bytes32 indexed opId);
    event OperationCancelled(bytes32 indexed opId);

    event FacetSet(bytes4 indexed selector, address indexed facet);
    event FacetRemoved(bytes4 indexed selector);
    event TreasuryUpdated(address indexed treasury);
    event ResolverUpdated(address indexed resolver);

    error ZeroAddress();
    error OpInvalid();
    error OpNotReady(uint256 readyAt);
    error TagMismatch();
    error DataMismatch();
    error NotAContract(address addr);
    error Paused();
    error OpExpired();
    error NoFacet();

    uint256 public constant OP_EXPIRY_WINDOW = 7 days;

    constructor(address admin, address usdc_, address treasury_, uint256 minTimelockDelay_) {
        if (admin == address(0) || usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
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

    function _consume(bytes32 opId, bytes32 tag, bytes memory data) internal {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        if (block.timestamp < op.readyAt) revert OpNotReady(op.readyAt);
        if (block.timestamp > op.readyAt + OP_EXPIRY_WINDOW) revert OpExpired();
        if (op.tag != tag) revert TagMismatch();
        if (op.dataHash != keccak256(data)) revert DataMismatch();

        op.status = OpStatus.Executed;
        emit OperationExecuted(opId);
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

    /**
     * @notice Emergency function to disable a specific selector.
     * @dev Does not require timelock as it is a safety/emergency measure.
     */
    function removeFacet(bytes4 selector) external onlyRole(DEFAULT_ADMIN_ROLE) {
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

    fallback() external payable {
        if (_paused) revert Paused();
        address facet = facetOf[msg.sig];
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

    receive() external payable {}
}
