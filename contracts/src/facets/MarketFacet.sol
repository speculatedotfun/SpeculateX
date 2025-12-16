// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../CoreStorage.sol";
import "../PositionToken.sol";

contract MarketFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event MarketCreated(
        uint256 indexed id,
        address yes,
        address no,
        bytes32 questionHash,
        string question,
        uint256 initUsdc,
        uint256 expiryTimestamp
    );

    error InvalidMarket();
    error InvalidExpiry();
    error InsufficientSeed();

    modifier onlyRole(bytes32 role) {
        require(IAccessControl(address(this)).hasRole(role, msg.sender), "NO_ROLE");
        _;
    }

    function createMarket(
        string memory question,
        string memory yesName,
        string memory yesSymbol,
        string memory noName,
        string memory noSymbol,
        uint256 initUsdc,
        uint256 expiryTimestamp,
        address oracleFeed,
        bytes32 priceFeedId,
        uint256 targetValue,
        Comparison comparison
    ) external whenNotPaused onlyRole(MARKET_CREATOR_ROLE) returns (uint256 id) {
        if (initUsdc < minMarketSeed) revert InsufficientSeed();
        if (expiryTimestamp <= block.timestamp) revert InvalidExpiry();

        id = ++marketCount;

        PositionToken yes = new PositionToken(yesName, yesSymbol, address(this));
        PositionToken no  = new PositionToken(noName,  noSymbol,  address(this));

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), initUsdc);

        uint256 ln2E18 = 693147180559945309;
        uint256 bE18_  = (initUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        OracleType oType = oracleFeed == address(0) ? OracleType.None : OracleType.ChainlinkFeed;
        bytes32 qh = keccak256(bytes(question));

        markets[id] = Market({
            yes: yes,
            no: no,
            qYes: 0,
            qNo: 0,
            bE18: bE18_,
            usdcVault: initUsdc,
            feeTreasuryBps: defaultFeeTreasuryBps,
            feeLpBps: defaultFeeLpBps,
            feeVaultBps: defaultFeeVaultBps,
            status: MarketStatus.Active,
            questionHash: qh,
            creator: msg.sender,
            totalLpUsdc: initUsdc,
            lpFeesUSDC: 0,
            residualUSDC: 0,
            priceBandThresholdUSDC: 10_000e6,
            maxJumpE18: 0,
            resolution: ResolutionConfig({
                expiryTimestamp: expiryTimestamp,
                oracleType: oType,
                oracleAddress: oracleFeed,
                priceFeedId: priceFeedId,
                targetValue: targetValue,
                comparison: comparison,
                yesWins: false,
                isResolved: false
            })
        });

        lpShares[id][msg.sender] = initUsdc;

        emit MarketCreated(id, address(yes), address(no), qh, question, initUsdc, expiryTimestamp);
    }

    function getMarketState(uint256 id)
        external
        view
        returns (uint256 qYes, uint256 qNo, uint256 vault, uint256 bE18_, MarketStatus status, bytes32 questionHash)
    {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return (m.qYes, m.qNo, m.usdcVault, m.bE18, m.status, m.questionHash);
    }

    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return m.resolution;
    }
}
