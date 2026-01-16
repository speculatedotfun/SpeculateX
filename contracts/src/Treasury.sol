// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Treasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant ADMIN_ROLE      = keccak256("ADMIN_ROLE");

    uint256 public constant MIN_DELAY = 24 hours;
    uint256 public constant OP_EXPIRY_WINDOW = 7 days;
    uint256 public maxSingleLargeWithdraw; // safety cap in token units
    uint256 public maxDailyLimit; // safety cap in token units

    uint256 public dailyWithdrawLimit; // in token units (e.g. USDC 6 decimals)
    // Track daily withdrawals per token to avoid mixed-decimal footguns.
    mapping(address => uint256) public lastWithdrawDayByToken;
    mapping(address => uint256) public withdrawnTodayByToken;

    uint256 public opNonce;

    enum OpStatus { None, Scheduled, Executed, Cancelled }

    struct WithdrawalOp {
        address token;
        address to;
        uint256 amount;
        uint256 readyAt;
        OpStatus status;
    }

    mapping(bytes32 => WithdrawalOp) public ops;

    event Withdraw(address indexed token, address indexed to, uint256 amount);
    event LargeWithdrawScheduled(bytes32 indexed opId, address token, address to, uint256 amount, uint256 readyAt);
    event LargeWithdrawCancelled(bytes32 indexed opId);
    event LargeWithdrawExecuted(bytes32 indexed opId);
    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);

    error ZeroAddress();
    error BadAmount();
    error LimitExceeded();
    error OpInvalid();
    error NotReady(uint256 readyAt);
    error OpExpired();

    constructor(address admin, uint256 initialDailyLimit, uint8 tokenDecimals) {
        if (admin == address(0)) revert ZeroAddress();
        if (tokenDecimals > 18) revert BadAmount();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(WITHDRAWER_ROLE, admin);

        uint256 unit = 10 ** uint256(tokenDecimals);
        maxSingleLargeWithdraw = 1_000_000 * unit;
        maxDailyLimit = 5_000_000 * unit;
        if (initialDailyLimit == 0 || initialDailyLimit > maxDailyLimit) revert BadAmount();
        dailyWithdrawLimit = initialDailyLimit;
        emit DailyLimitUpdated(0, initialDailyLimit);
    }

    function withdraw(address token, address to, uint256 amount) external onlyRole(WITHDRAWER_ROLE) nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert BadAmount();

        uint256 dayNow = block.timestamp / 1 days;
        uint256 lastDay = lastWithdrawDayByToken[token];
        if (dayNow > lastDay) {
            lastWithdrawDayByToken[token] = dayNow;
            withdrawnTodayByToken[token] = 0;
        }

        uint256 used = withdrawnTodayByToken[token];
        if (used + amount > dailyWithdrawLimit) revert LimitExceeded();

        withdrawnTodayByToken[token] = used + amount;
        IERC20(token).safeTransfer(to, amount);
        emit Withdraw(token, to, amount);
    }

    function scheduleLargeWithdraw(address token, address to, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
        returns (bytes32 opId)
    {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > maxSingleLargeWithdraw) revert BadAmount();

        uint256 nonce_ = ++opNonce;
        opId = keccak256(abi.encode(
            keccak256("TREASURY_WITHDRAW_OP_V1"),
            token,
            to,
            amount,
            nonce_
        ));

        WithdrawalOp storage op = ops[opId];
        if (op.status != OpStatus.None) revert OpInvalid();

        uint256 readyAt = block.timestamp + MIN_DELAY;
        ops[opId] = WithdrawalOp({
            token: token,
            to: to,
            amount: amount,
            readyAt: readyAt,
            status: OpStatus.Scheduled
        });

        emit LargeWithdrawScheduled(opId, token, to, amount, readyAt);
    }

    function cancelLargeWithdraw(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        WithdrawalOp storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        op.status = OpStatus.Cancelled;
        emit LargeWithdrawCancelled(opId);
    }

    /**
     * @notice Executes a scheduled large withdrawal. 
     * @dev Large withdrawals bypass the dailycap because they are explicitly scheduled and timelocked.
     */
    function executeLargeWithdraw(bytes32 opId) external onlyRole(ADMIN_ROLE) nonReentrant {
        WithdrawalOp storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        if (block.timestamp < op.readyAt) revert NotReady(op.readyAt);
        if (block.timestamp > op.readyAt + OP_EXPIRY_WINDOW) revert OpExpired();

        op.status = OpStatus.Executed;

        IERC20(op.token).safeTransfer(op.to, op.amount);
        emit Withdraw(op.token, op.to, op.amount);
        emit LargeWithdrawExecuted(opId);
    }

    function setDailyLimit(uint256 newLimit) external onlyRole(ADMIN_ROLE) {
        if (newLimit > maxDailyLimit) revert BadAmount();
        // Sanity check: allow 0 only if explicitly intended to freeze regular withdrawals
        uint256 oldLimit = dailyWithdrawLimit;
        dailyWithdrawLimit = newLimit;
        emit DailyLimitUpdated(oldLimit, newLimit);
    }
}
