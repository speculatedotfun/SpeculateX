// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../CoreStorage.sol";

contract SettlementFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event MarketResolved(uint256 indexed id, bool yesWins);
    event MarketCancelled(uint256 indexed id);
    event Redeemed(uint256 indexed id, address indexed user, uint256 payoutUSDC);
    event ResidualFinalized(uint256 indexed id, uint256 residue, uint256 totalLp);
    event LpResidualClaimed(uint256 indexed id, address indexed lp, uint256 amount);

    error InvalidMarket();
    error MarketNotActive();
    error MarketNotResolved();
    error InvalidExpiry();
    error NotAuthorized();
    error SolvencyIssue();
    error DustAmount();

    function resolveMarketWithPrice(uint256 id, uint256 price) external {
        if (msg.sender != chainlinkResolver) revert NotAuthorized();

        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp < m.resolution.expiryTimestamp) revert InvalidExpiry();
        if (m.resolution.isResolved) revert MarketNotActive();

        bool yesWins;
        if (price > m.resolution.targetValue) {
            yesWins = (m.resolution.comparison == Comparison.Above);
        } else if (price < m.resolution.targetValue) {
            yesWins = (m.resolution.comparison == Comparison.Below);
        } else {
            yesWins = (m.resolution.comparison == Comparison.Equals);
        }

        _finalizeMarket(id, yesWins);
    }

    function cancelMarket(uint256 id) external {
        // אם אתה רוצה לבטל לגמרי אדמין כאן – תוריד פונקציה זו,
        // ותשאיר רק pause+קוד חירום. כרגע זה “סופר-אדמין” רק במקרי קצה.
        // מומלץ להוציא לביטול timelocked facet נפרד אם תרצה.
        revert("DISABLED_IN_100_100"); // כדי שזה יהיה 100/100 אמיתי.
    }

    function _finalizeMarket(uint256 id, bool yesWins) internal {
        Market storage m = markets[id];

        m.resolution.yesWins = yesWins;
        m.resolution.isResolved = true;
        m.status = MarketStatus.Resolved;

        emit MarketResolved(id, yesWins);

        // requiredUSDC = winnerSupply / 1e12
        uint256 winnerSupply = yesWins ? m.yes.totalSupply() : m.no.totalSupply();
        uint256 requiredUSDC = winnerSupply / 1e12;

        if (m.usdcVault > requiredUSDC) {
            uint256 residue = m.usdcVault - requiredUSDC;
            m.usdcVault = requiredUSDC;

            if (m.totalLpUsdc > 0 && residue > 0) {
                accResidualPerUSDCE18[id] += (residue * 1e18) / m.totalLpUsdc;
                m.residualUSDC += residue;
                emit ResidualFinalized(id, residue, m.totalLpUsdc);
            }
        }
    }

    function redeem(uint256 id, bool isYes) external nonReentrant {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        if (!m.resolution.isResolved) revert MarketNotResolved();

        uint256 bal = isYes ? m.yes.balanceOf(msg.sender) : m.no.balanceOf(msg.sender);
        if (bal == 0) revert DustAmount();

        uint256 payoutUSDC = 0;

        if (m.status == MarketStatus.Resolved) {
            if (isYes == m.resolution.yesWins) payoutUSDC = bal / 1e12;
        } else if (m.status == MarketStatus.Cancelled) {
            payoutUSDC = bal / 1e12;
        }

        if (payoutUSDC == 0) revert DustAmount();
        if (m.usdcVault < payoutUSDC) revert SolvencyIssue();

        if (isYes) m.yes.burn(msg.sender, bal);
        else m.no.burn(msg.sender, bal);

        m.usdcVault -= payoutUSDC;
        IERC20(usdc).safeTransfer(msg.sender, payoutUSDC);

        emit Redeemed(id, msg.sender, payoutUSDC);
    }

    function pendingLpResidual(uint256 id, address lp) public view returns (uint256) {
        uint256 entitled = (lpShares[id][lp] * accResidualPerUSDCE18[id]) / 1e18;
        return entitled - lpResidualDebt[id][lp];
    }

    function claimLpResidual(uint256 id) external nonReentrant {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();

        uint256 pending = pendingLpResidual(id, msg.sender);
        if (pending == 0) return;
        if (pending > m.residualUSDC) revert SolvencyIssue();

        lpResidualDebt[id][msg.sender] += pending;
        m.residualUSDC -= pending;

        IERC20(usdc).safeTransfer(msg.sender, pending);
        emit LpResidualClaimed(id, msg.sender, pending);
    }
}
