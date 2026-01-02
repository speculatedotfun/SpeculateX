// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

