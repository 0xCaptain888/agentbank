// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PerformanceTracker
 * @notice Tracks per-analyst performance metrics for the marketplace.
 *         Used by Allocator to make weighted signal selection decisions.
 */
contract PerformanceTracker is Ownable {

    struct Performance {
        uint256 totalSignals;
        uint256 executedSignals;
        uint256 blockedSignals;
        int256  cumulativePnL;
        uint256 avgConfidence;
        uint256 winRate;           // basis points (0-10000)
        uint256 lastUpdated;
    }

    mapping(uint256 => Performance) public performances; // agentId => Performance

    event PerformanceUpdated(uint256 indexed agentId, int256 pnl, bool executed);

    constructor() Ownable(msg.sender) {}

    function recordSignalOutcome(
        uint256 agentId,
        int256 pnl,
        bool executed,
        uint256 confidence
    ) external onlyOwner {
        Performance storage p = performances[agentId];
        p.totalSignals++;

        if (executed) {
            p.executedSignals++;
            p.cumulativePnL += pnl;
            if (pnl > 0) {
                p.winRate = (p.winRate * (p.executedSignals - 1) + 10000) / p.executedSignals;
            } else {
                p.winRate = (p.winRate * (p.executedSignals - 1)) / p.executedSignals;
            }
        } else {
            p.blockedSignals++;
        }

        // Running average confidence
        p.avgConfidence = (p.avgConfidence * (p.totalSignals - 1) + confidence) / p.totalSignals;
        p.lastUpdated = block.timestamp;

        emit PerformanceUpdated(agentId, pnl, executed);
    }

    function getPerformance(uint256 agentId) external view returns (Performance memory) {
        return performances[agentId];
    }

    function getSharpeProxy(uint256 agentId) external view returns (int256) {
        Performance memory p = performances[agentId];
        if (p.executedSignals == 0) return 0;
        // Simplified Sharpe proxy: avg PnL / signal count
        return p.cumulativePnL / int256(p.executedSignals);
    }
}
