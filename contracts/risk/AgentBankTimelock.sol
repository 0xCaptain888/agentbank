// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract AgentBankTimelock is TimelockController {
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(48 hours, proposers, executors, admin) {}
}
