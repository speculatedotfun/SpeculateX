// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Helper contract to force send ETH (bypass receive())
contract ForceSendETH {
    function sendETH(address to) external payable {
        selfdestruct(payable(to));
    }
}

