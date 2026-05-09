// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeDistributor
 * @notice Distributes performance fees to analysts based on their signal attribution.
 *         Called by Allocator after successful operations to reward contributing analysts.
 */
contract FeeDistributor is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;
    address public analystRegistry;

    uint256 public totalDistributed;
    uint256 public pendingDistribution;

    struct Distribution {
        address recipient;
        uint256 amount;
        bytes32 signalId;
        uint256 timestamp;
    }

    Distribution[] public distributions;

    event FeeDistributed(address indexed recipient, uint256 amount, bytes32 signalId);
    event RegistryUpdated(address indexed newRegistry);

    constructor(address _rewardToken, address _analystRegistry) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
        analystRegistry = _analystRegistry;
    }

    function setAnalystRegistry(address _registry) external onlyOwner {
        analystRegistry = _registry;
        emit RegistryUpdated(_registry);
    }

    function distribute(address recipient, uint256 amount, bytes32 signalId) external {
        require(msg.sender == analystRegistry, "only registry");
        require(amount > 0, "zero amount");

        rewardToken.safeTransfer(recipient, amount);
        totalDistributed += amount;

        distributions.push(Distribution({
            recipient: recipient,
            amount: amount,
            signalId: signalId,
            timestamp: block.timestamp
        }));

        emit FeeDistributed(recipient, amount, signalId);
    }

    function fundPool(uint256 amount) external {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        pendingDistribution += amount;
    }

    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }

    function getRecentDistributions(uint256 count) external view returns (Distribution[] memory) {
        uint256 total = distributions.length;
        uint256 start = total > count ? total - count : 0;
        uint256 len = total - start;
        Distribution[] memory recent = new Distribution[](len);
        for (uint256 i = 0; i < len; i++) {
            recent[i] = distributions[start + i];
        }
        return recent;
    }
}
