// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    mapping(address => bool) public minters; // Addresses allowed to mint
    address public speculateCore; // SpeculateCore contract address

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event SpeculateCoreSet(address indexed speculateCore);

    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        minters[msg.sender] = true; // Owner is also a minter
    }

    function decimals() public pure override returns (uint8) { 
        return 6;
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || owner() == msg.sender, "not minter");
        _;
    }

    // Set SpeculateCore contract address (only owner)
    function setSpeculateCore(address _speculateCore) external onlyOwner {
        require(_speculateCore != address(0), "zero address");
        speculateCore = _speculateCore;
        emit SpeculateCoreSet(_speculateCore);
    }

    // Add a minter (only owner)
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "zero address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    // Remove a minter (only owner)
    function removeMinter(address minter) external onlyOwner {
        require(minter != address(0), "zero address");
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    // Check if caller has DEFAULT_ADMIN_ROLE in SpeculateCore
    // This allows the admin of the market system to mint USDC for testing/faucets
    function _isSpeculateCoreAdmin(address account) internal view returns (bool) {
        if (speculateCore == address(0)) return false;
        
        // DEFAULT_ADMIN_ROLE is 0x00...00
        bytes32 DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
        
        // Static call to check role to avoid importing the whole interface
        (bool success, bytes memory data) = speculateCore.staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", DEFAULT_ADMIN_ROLE, account)
        );
        
        if (success && data.length >= 32) {
            bool hasRole = abi.decode(data, (bool));
            return hasRole;
        }
        
        return false;
    }

    // Mint tokens - can be called by owner, whitelisted minters, or SpeculateCore admins
    function mint(address to, uint256 amount) external {
        require(
            owner() == msg.sender || 
            minters[msg.sender] || 
            _isSpeculateCoreAdmin(msg.sender),
            "not authorized"
        );
        _mint(to, amount);
    }

    // Burn tokens
    function burn(address from, uint256 amount) external {
        require(
            owner() == msg.sender || 
            minters[msg.sender] || 
            _isSpeculateCoreAdmin(msg.sender),
            "not authorized"
        );
        _burn(from, amount);
    }
}