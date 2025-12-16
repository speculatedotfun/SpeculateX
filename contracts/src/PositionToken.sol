// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PositionToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error ZeroAddress();
    error BadAmount();

    constructor(string memory name_, string memory symbol_, address core) ERC20(name_, symbol_) {
        if (core == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, core);
        _grantRole(MINTER_ROLE, core);
        _grantRole(BURNER_ROLE, core);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert BadAmount();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert BadAmount();
        _burn(from, amount);
    }
}
