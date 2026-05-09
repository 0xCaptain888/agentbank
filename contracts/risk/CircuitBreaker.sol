// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CircuitBreaker is AccessControl {
    bytes32 public constant TRIPPER_ROLE = keccak256("TRIPPER_ROLE");
    bytes32 public constant RESET_ROLE   = keccak256("RESET_ROLE");

    bool    public open;
    uint256 public openedAt;
    uint256 public minOpenDuration = 4 hours;
    string  public lastReason;

    event Tripped(string reason, uint256 timestamp);
    event Reset(uint256 timestamp);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function trip(uint256 magnitude, uint256 timestamp) external onlyRole(TRIPPER_ROLE) {
        open = true;
        openedAt = timestamp;
        lastReason = string(abi.encodePacked("magnitude:", _toString(magnitude)));
        emit Tripped(lastReason, timestamp);
    }

    function reset() external onlyRole(RESET_ROLE) {
        require(open, "not open");
        require(block.timestamp >= openedAt + minOpenDuration, "min duration not met");
        open = false;
        emit Reset(block.timestamp);
    }

    function isOpen() external view returns (bool) { return open; }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v; uint256 d;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
