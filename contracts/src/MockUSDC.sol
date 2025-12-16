// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MockUSDC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error ZeroAddress();
    error BadAmount();

    constructor(address admin) ERC20("Mock USDC", "mUSDC") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert BadAmount();
        _mint(to, amount);
    }

    // Public faucet for testnet - allows anyone to mint up to 1M USDC per call
    function faucet(uint256 amount) external {
        if (amount == 0) revert BadAmount();
        if (amount > 1_000_000e6) revert BadAmount(); // Max 1M USDC per call
        _mint(msg.sender, amount);
    }
}
