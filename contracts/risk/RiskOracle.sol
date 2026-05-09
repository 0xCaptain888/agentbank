// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title RiskOracle
 * @notice Pyth-fed price + TWAP + anomaly detection for Guard Agent.
 */
contract RiskOracle {

    address public immutable pyth;
    address public owner;

    mapping(address => bytes32) public priceIds;

    struct PriceSnapshot {
        int64  price;
        uint64 conf;
        int32  expo;
        uint64 timestamp;
    }

    mapping(address => PriceSnapshot[24]) public history;
    mapping(address => uint8) public head;

    uint256 public constant ANOMALY_BPS = 500;

    event PriceIdSet(address token, bytes32 priceId);
    event SnapshotTaken(address token, int64 price, uint64 timestamp);
    event AnomalyDetected(address token, int64 spot, int64 twap1h, uint256 deviationBps);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(address _pyth) { pyth = _pyth; owner = msg.sender; }

    function setPriceId(address token, bytes32 priceId) external onlyOwner {
        priceIds[token] = priceId;
        emit PriceIdSet(token, priceId);
    }

    function snapshot(address token, int64 price) external {
        history[token][head[token]] = PriceSnapshot(price, 0, -8, uint64(block.timestamp));
        head[token] = (head[token] + 1) % 24;
        emit SnapshotTaken(token, price, uint64(block.timestamp));
    }

    function checkAnomaly(address token, int64 currentPrice) external view returns (
        bool anomaly, int64 spot, int64 twap1h, uint256 deviationBps
    ) {
        spot = currentPrice;
        int128 sum = 0;
        uint256 count = 0;
        uint256 cutoff = block.timestamp - 1 hours;
        for (uint8 i = 0; i < 24; i++) {
            PriceSnapshot memory s = history[token][i];
            if (s.timestamp >= cutoff && s.timestamp > 0) {
                sum += int128(s.price);
                count++;
            }
        }
        if (count == 0) return (false, spot, spot, 0);
        twap1h = int64(sum / int128(uint128(count)));

        int64 diff = spot > twap1h ? spot - twap1h : twap1h - spot;
        int64 abstwap = twap1h > 0 ? twap1h : -twap1h;
        deviationBps = abstwap == 0 ? 0 : uint256(uint64(diff)) * 10_000 / uint256(uint64(abstwap));
        anomaly = deviationBps >= ANOMALY_BPS;
    }
}
