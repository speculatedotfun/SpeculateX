// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// src/interfaces/AggregatorV3Interface.sol

/**
 * @title AggregatorV3Interface
 * @notice Chainlink Price Feed Interface
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    
    function description() external view returns (string memory);
    
    function version() external view returns (uint256);

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

// src/interfaces/AutomationCompatibleInterface.sol

/**
 * @notice Chainlink Automation Compatible Interface
 * @dev https://docs.chain.link/chainlink-automation/compatible-contracts
 */
interface AutomationCompatibleInterface {
    /**
     * @notice Checks if upkeep is needed
     * @param checkData Encoded data to perform the check
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Encoded data to perform the upkeep
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData);

    /**
     * @notice Performs the upkeep
     * @param performData Encoded data to perform the upkeep
     */
    function performUpkeep(bytes calldata performData) external;
}

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/access/IAccessControl.sol

// OpenZeppelin Contracts (last updated v5.4.0) (access/IAccessControl.sol)

/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/ERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/ERC165.sol)

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// lib/openzeppelin-contracts/contracts/utils/Pausable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// lib/openzeppelin-contracts/contracts/access/AccessControl.sol

// OpenZeppelin Contracts (last updated v5.4.0) (access/AccessControl.sol)

/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}

// src/ChainlinkResolver.sol

interface ICoreResolutionView {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
        uint256 startTime;      // When trading becomes active (0 = immediate)
        uint256 expiryTimestamp;
        OracleType oracleType;
        address oracleAddress;
        bytes32 priceFeedId;
        uint256 targetValue;
        uint8 comparison; // Comparison enum (not used here)
        bool yesWins;
        bool isResolved;
        uint8 oracleDecimals;
    }
    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory);
    function resolveMarketWithPrice(uint256 id, uint256 price) external;
    function marketCount() external view returns (uint256);
}

contract ChainlinkResolver is AccessControl, ReentrancyGuard, Pausable, AutomationCompatibleInterface {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public timelockDelay = 24 hours;
    uint256 public maxStaleness  = 2 hours; // kept for backward compatibility / future use
    uint256 public opNonce;

    address public core;

    enum OpStatus { None, Scheduled, Executed, Cancelled }
    struct Op {
        bytes32 tag;
        bytes32 dataHash;
        uint256 readyAt;
        OpStatus status;
    }
    mapping(bytes32 => Op) public ops;

    bytes32 public constant OP_SET_CORE      = keccak256("OP_SET_CORE");
    bytes32 public constant OP_SET_STALENESS = keccak256("OP_SET_STALENESS");
    bytes32 public constant OP_SET_DELAY     = keccak256("OP_SET_DELAY");
    bytes32 public constant OP_PAUSE         = keccak256("OP_PAUSE");
    bytes32 public constant OP_UNPAUSE       = keccak256("OP_UNPAUSE");

    event OpScheduled(bytes32 indexed opId, bytes32 indexed tag, uint256 readyAt);
    event OpExecuted(bytes32 indexed opId);
    event OpCancelled(bytes32 indexed opId);

    event CoreUpdated(address indexed newCore);
    event MaxStalenessUpdated(uint256 newMaxStaleness);
    event TimelockDelayUpdated(uint256 newDelay);

    event MarketResolved(uint256 indexed marketId, address indexed feed, uint256 price, uint256 updatedAt);
    event MarketResolvedTwap(uint256 indexed marketId, address indexed feed, uint256 twapPrice, uint256 windowStart, uint256 windowEnd);
    event MarketResolvedLate(uint256 indexed marketId, address indexed feed, uint256 updatedAt);

    error ZeroAddress();
    error BadValue();
    error OpInvalid();
    error OpNotReady(uint256 readyAt);
    error TagMismatch();
    error DataMismatch();
    error OpExpired();

    error NotChainlinkMarket();
    error FeedMissing();
    error InvalidAnswer();
    error Stale(uint256 updatedAt, uint256 nowTs, uint256 maxStale);
    error OracleDecimalsMismatch(uint8 expected, uint8 got);
    error MarketNotExpired();
    error RoundTooEarly(uint256 updatedAt, uint256 expiry);
    error NotFirstRoundAfterExpiry(uint256 prevUpdatedAt, uint256 expiry);
    error IncompleteRound();
    error UnsupportedDecimals();
    error InvalidRoundId();
    error PhaseBoundaryRound(); // cannot safely compute prev round id (occurs at round 0 or 1, or during phase transitions - rare edge case)

    uint256 public constant MIN_TIMELOCK = 24 hours;
    uint256 public constant OP_EXPIRY_WINDOW = 7 days;

    // =========================
    // Resolution policy knobs
    // =========================
    // SLA: resolve using FIRST Chainlink update after expiry if it arrives within this window
    uint256 public constant RESOLVE_SLA = 5 minutes;

    // TWAP fallback window: [expiry, expiry + TWAP_WINDOW]
    uint256 public constant TWAP_WINDOW = 5 minutes;

    // Lookback limits
    uint256 public constant MAX_LOOKBACK_FIRST = 96;
    uint256 public constant MAX_LOOKBACK_TWAP  = 256;

    constructor(address admin, address core_) {
        if (admin == address(0) || core_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        core = core_;
    }

    function scheduleOp(bytes32 tag, bytes calldata data) external onlyRole(ADMIN_ROLE) returns (bytes32 opId) {
        uint256 nonce_ = ++opNonce;
        opId = keccak256(abi.encode("RESOLVER_OP_V1", tag, keccak256(data), nonce_));
        if (ops[opId].status != OpStatus.None) revert OpInvalid();

        ops[opId] = Op({
            tag: tag,
            dataHash: keccak256(data),
            readyAt: block.timestamp + timelockDelay,
            status: OpStatus.Scheduled
        });

        emit OpScheduled(opId, tag, ops[opId].readyAt);
    }

    function _consume(bytes32 opId, bytes32 tag, bytes memory data) internal {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        if (block.timestamp < op.readyAt) revert OpNotReady(op.readyAt);
        if (block.timestamp > op.readyAt + OP_EXPIRY_WINDOW) revert OpExpired();
        if (op.tag != tag) revert TagMismatch();
        if (op.dataHash != keccak256(data)) revert DataMismatch();
        op.status = OpStatus.Executed;
        emit OpExecuted(opId);
    }

    function executeSetCore(bytes32 opId, address newCore) external onlyRole(ADMIN_ROLE) {
        if (newCore == address(0)) revert ZeroAddress();
        bytes memory data = abi.encode(newCore);
        _consume(opId, OP_SET_CORE, data);
        core = newCore;
        emit CoreUpdated(newCore);
    }

    function executeSetMaxStaleness(bytes32 opId, uint256 newMax) external onlyRole(ADMIN_ROLE) {
        if (newMax == 0) revert BadValue();
        bytes memory data = abi.encode(newMax);
        _consume(opId, OP_SET_STALENESS, data);
        maxStaleness = newMax;
        emit MaxStalenessUpdated(newMax);
    }

    function executeSetDelay(bytes32 opId, uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        if (newDelay < MIN_TIMELOCK) revert BadValue();
        bytes memory data = abi.encode(newDelay);
        _consume(opId, OP_SET_DELAY, data);
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }

    function executePause(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        _consume(opId, OP_PAUSE, "");
        _pause();
    }

    function executeUnpause(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        _consume(opId, OP_UNPAUSE, "");
        _unpause();
    }

    function cancelOp(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        op.status = OpStatus.Cancelled;
        emit OpCancelled(opId);
    }

    /**
     * @notice Parse composite Chainlink round ID into phase and aggregator round
     * @dev Chainlink uses composite IDs: phaseId (upper 16 bits) | aggregatorRoundId (lower 64 bits)
     */
    function parseRoundId(uint80 roundId) internal pure returns (uint16 phaseId, uint64 aggregatorRoundId) {
        phaseId = uint16(roundId >> 64);
        aggregatorRoundId = uint64(roundId);
    }

    // =========================
    // Automation
    // =========================

    /**
     * @notice Chainlink Automation: Check if upkeep is needed
     * @param checkData Encoded marketId (uint256) - if empty, searches first N markets
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Encoded marketId if upkeep is needed
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // If checkData is provided, check specific market
        if (checkData.length >= 32) {
            uint256 marketId = abi.decode(checkData, (uint256));
            return _checkSingleMarket(marketId);
        }

        // Search for first market that needs resolution (limit to 50 to keep checkUpkeep cheap)
        uint256 maxMarketsToCheck = 50;
        uint256 totalMarkets = ICoreResolutionView(core).marketCount();
        uint256 endId = totalMarkets > maxMarketsToCheck ? maxMarketsToCheck : totalMarkets;

        for (uint256 i = 1; i <= endId; i++) {
            (bool needed, bytes memory data) = _checkSingleMarket(i);
            if (needed) return (true, data);
        }

        return (false, "");
    }

    function _checkSingleMarket(uint256 marketId)
        internal
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        ICoreResolutionView.ResolutionConfig memory r;
        try ICoreResolutionView(core).getMarketResolution(marketId) returns (ICoreResolutionView.ResolutionConfig memory config) {
            r = config;
        } catch {
            return (false, "");
        }

        if (r.isResolved) return (false, "");
        if (block.timestamp < r.expiryTimestamp) return (false, "");

        // Chainlink market detection (includes your workaround)
        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) return (false, "");

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) return (false, "");
        }

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (uint80 latestRoundId, , , uint256 latestUpdatedAt, ) = feed.latestRoundData();

        // Need at least one update after expiry to be resolvable
        if (latestUpdatedAt < r.expiryTimestamp) return (false, "");

        // Avoid resolving extremely old markets via automation
        if (block.timestamp - latestUpdatedAt > 7 days) return (false, "");

        // Pre-filter phase boundary cases to avoid likely revert in resolveAuto
        (, uint64 aggRound) = parseRoundId(latestRoundId);
        if (aggRound <= 1) return (false, ""); // wait for next update to avoid PhaseBoundaryRound revert

        return (true, abi.encode(marketId));
    }

    function performUpkeep(bytes calldata performData) external override {
        if (performData.length != 32) revert BadValue();
        uint256 marketId = abi.decode(performData, (uint256));
        resolveAuto(marketId);
    }

    // =========================
    // Auto-resolve policy:
    // 1) FIRST update after expiry within SLA -> resolve(first)
    // 2) else if oracle has updates covering end of TWAP window -> resolve(TWAP [expiry, expiry+TWAP_WINDOW])
    // 3) else -> resolve(first) (late), because TWAP can't be anchored without an update after window end
    // =========================

    function resolveAuto(uint256 marketId) public nonReentrant whenNotPaused {
        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        if (r.isResolved) return;
        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) revert NotChainlinkMarket();

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) revert FeedMissing();
        }

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);

        // decimals checks (same spirit as resolve())
        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();
        if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
            revert OracleDecimalsMismatch(r.oracleDecimals, decNow);
        }

        // 1) first round after expiry
        (uint80 firstRid, uint256 firstUpdatedAt) = _firstRoundAfterTs(feed, r.expiryTimestamp, MAX_LOOKBACK_FIRST);

        // 2) SLA path
        if (firstUpdatedAt <= r.expiryTimestamp + RESOLVE_SLA) {
            _resolveWithRound(marketId, firstRid);
            return;
        }

        // 3) TWAP path only if we have an update after the end of the TWAP window (anchor)
        uint256 windowStart = r.expiryTimestamp;
        uint256 windowEnd = r.expiryTimestamp + TWAP_WINDOW;

        (, , , uint256 latestUpdatedAt, ) = feed.latestRoundData();
        if (latestUpdatedAt < windowEnd) {
            // Can't compute TWAP [windowStart, windowEnd] reliably (no round after window end),
            // so fallback to first-after-expiry even though it's late.
            _resolveWithRound(marketId, firstRid);
            // _resolveWithRound emits MarketResolved; we add explicit "late" marker
            emit MarketResolvedLate(marketId, feedAddress, firstUpdatedAt);
            return;
        }

        // Try TWAP computation with fallback to first-after-expiry if it fails (e.g., phase boundary)
        try this.computeTwapExternal(feedAddress, windowStart, windowEnd) returns (uint256 twapPrice1e18) {
            ICoreResolutionView(core).resolveMarketWithPrice(marketId, twapPrice1e18);
            emit MarketResolvedTwap(marketId, feedAddress, twapPrice1e18, windowStart, windowEnd);
        } catch {
            // TWAP failed (phase boundary / missing rounds) -> fallback to first-after-expiry
            _resolveWithRound(marketId, firstRid);
            emit MarketResolvedLate(marketId, feedAddress, firstUpdatedAt);
        }
    }

    /**
     * @notice Find the first round whose updatedAt >= ts, and whose previous round updatedAt < ts
     * @dev Note: If the first round after expiry is round 1 of a new phase, this will revert with PhaseBoundaryRound.
     *      This is a rare edge case (phase transitions are infrequent). Manual resolution may be required.
     */
    function _firstRoundAfterTs(AggregatorV3Interface feed, uint256 ts, uint256 maxSteps)
        internal
        view
        returns (uint80 roundId, uint256 updatedAt)
    {
        (uint80 curRid, , , uint256 curUpdatedAt, ) = feed.latestRoundData();
        if (curUpdatedAt < ts) revert RoundTooEarly(curUpdatedAt, ts);

        for (uint256 i = 0; i < maxSteps; i++) {
            (uint16 phase, uint64 aggRound) = parseRoundId(curRid);
            if (aggRound <= 1) revert PhaseBoundaryRound(); // Cannot verify previous round at phase boundary

            uint80 prevRid = (uint80(phase) << 64) | (aggRound - 1);

            try feed.getRoundData(prevRid) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
                if (prevUpdatedAt < ts) {
                    return (curRid, curUpdatedAt);
                }
                curRid = prevRid;
                curUpdatedAt = prevUpdatedAt;
            } catch {
                revert IncompleteRound();
            }
        }

        revert IncompleteRound();
    }

    /**
     * @notice External wrapper for TWAP computation (allows try/catch in resolveAuto)
     * @dev This is needed because internal functions cannot be caught with try/catch
     */
    function computeTwapExternal(address feedAddress, uint256 startTs, uint256 endTs)
        external
        view
        returns (uint256)
    {
        if (feedAddress == address(0) || feedAddress == address(1)) revert FeedMissing();
        return _computeTwap1e18(AggregatorV3Interface(feedAddress), startTs, endTs);
    }

    /**
     * @notice Time-weighted average price (TWAP) over [startTs, endTs], normalized to 1e18
     * @dev Uses step function: previous round's price applies until current round's updatedAt
     *      Requires existence of a round after endTs to anchor the end boundary.
     */
    function _computeTwap1e18(
        AggregatorV3Interface feed,
        uint256 startTs,
        uint256 endTs
    ) internal view returns (uint256 twap1e18) {
        if (endTs <= startTs) revert BadValue();

        (uint80 endRound, uint256 endRoundUpdatedAt) = _firstRoundAfterTs(feed, endTs, MAX_LOOKBACK_FIRST);

        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();

        uint256 weightedSum = 0;
        uint256 totalDur = 0;

        uint80 curRid = endRound;
        uint256 curUpdatedAt = endRoundUpdatedAt;

        for (uint256 i = 0; i < MAX_LOOKBACK_TWAP; i++) {
            (uint16 phase, uint64 aggRound) = parseRoundId(curRid);
            if (aggRound <= 1) revert PhaseBoundaryRound();

            uint80 prevRid = (uint80(phase) << 64) | (aggRound - 1);

            (uint80 prid, int256 prevAnswer, , uint256 prevUpdatedAt, uint80 prevAnsweredInRound) = feed.getRoundData(prevRid);
            if (prevAnswer <= 0 || prevUpdatedAt == 0) revert InvalidAnswer();
            if (prevAnsweredInRound < prid) revert IncompleteRound();

            uint256 segStart = prevUpdatedAt < startTs ? startTs : prevUpdatedAt;
            uint256 segEnd   = curUpdatedAt > endTs ? endTs : curUpdatedAt;

            if (segEnd > segStart) {
                uint256 dur = segEnd - segStart;

                uint256 raw = uint256(prevAnswer);
                uint256 p1e18;
                if (decNow == 18) {
                    p1e18 = raw;
                } else if (decNow < 18) {
                    p1e18 = raw * (10 ** (18 - decNow));
                } else {
                    p1e18 = raw / (10 ** (decNow - 18));
                }

                weightedSum += p1e18 * dur;
                totalDur += dur;
            }

            if (prevUpdatedAt <= startTs) break;

            curRid = prevRid;
            curUpdatedAt = prevUpdatedAt;
        }

        if (totalDur == 0) revert IncompleteRound();
        return weightedSum / totalDur;
    }

    // =========================
    // Internal resolution logic (without nonReentrant to allow calls from resolveAuto)
    // =========================

    function _resolveWithRound(uint256 marketId, uint80 roundId) internal {
        if (roundId == 0) revert InvalidRoundId();

        (uint16 phase, uint64 aggregatorRound) = parseRoundId(roundId);
        if (aggregatorRound <= 1) revert PhaseBoundaryRound(); // Cannot verify previous round at phase boundary (round 0 or 1)

        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) {
            revert NotChainlinkMarket();
        }

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) {
                revert FeedMissing();
            }
        }

        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);

        // 1. Verify decimals if set
        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();
        if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
            revert OracleDecimalsMismatch(r.oracleDecimals, decNow);
        }

        // 2. Fetch target round data
        (uint80 rid, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = feed.getRoundData(roundId);
        if (answer <= 0 || updatedAt == 0) revert InvalidAnswer();
        if (answeredInRound < rid) revert IncompleteRound();

        // 3. Verify target round is AFTER expiry
        if (updatedAt < r.expiryTimestamp) revert RoundTooEarly(updatedAt, r.expiryTimestamp);

        // 4. Verify previous round was BEFORE expiry
        uint80 prevRoundId = (uint80(phase) << 64) | (aggregatorRound - 1);

        try feed.getRoundData(prevRoundId) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
            if (prevUpdatedAt >= r.expiryTimestamp) {
                revert NotFirstRoundAfterExpiry(prevUpdatedAt, r.expiryTimestamp);
            }
        } catch {
            revert IncompleteRound();
        }

        // 5. Staleness check (extremely old)
        uint256 maxAllowedAge = 7 days;
        if (block.timestamp - updatedAt > maxAllowedAge) {
            revert Stale(updatedAt, block.timestamp, maxAllowedAge);
        }

        // 6. Normalize price to 1e18
        uint256 rawPrice = uint256(answer);
        uint256 normalizedPrice = decNow == 18
            ? rawPrice
            : (decNow < 18) ? rawPrice * (10 ** (18 - decNow)) : rawPrice / (10 ** (decNow - 18));

        ICoreResolutionView(core).resolveMarketWithPrice(marketId, normalizedPrice);

        emit MarketResolved(marketId, address(feed), normalizedPrice, updatedAt);
    }

    // =========================
    // Manual / direct resolve using a specific roundId (public wrapper with nonReentrant)
    // =========================

    function resolve(uint256 marketId, uint80 roundId) public nonReentrant whenNotPaused {
        _resolveWithRound(marketId, roundId);
    }
}
