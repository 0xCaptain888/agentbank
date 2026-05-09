// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 §1 — Agent Identity Registry
 */
contract IdentityRegistry is Ownable {

    struct Agent {
        uint256 id;
        address agentAddress;
        string  domain;
        string  agentType;
        bytes32 metadataHash;
        uint256 registeredAt;
        bool    active;
    }

    uint256 private _nextId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public agentByAddress;
    mapping(string  => uint256) public agentByDomain;

    event AgentRegistered(uint256 indexed id, address indexed agentAddress, string domain, string agentType);
    event AgentUpdated(uint256 indexed id, string domain, bytes32 metadataHash);
    event AgentDeactivated(uint256 indexed id);

    constructor() Ownable(msg.sender) {}

    function registerAgent(
        address agentAddress,
        string calldata domain,
        string calldata agentType,
        bytes32 metadataHash
    ) external returns (uint256 id) {
        require(agentByAddress[agentAddress] == 0, "agent exists");
        require(agentByDomain[domain] == 0, "domain taken");
        id = _nextId++;
        agents[id] = Agent({
            id: id,
            agentAddress: agentAddress,
            domain: domain,
            agentType: agentType,
            metadataHash: metadataHash,
            registeredAt: block.timestamp,
            active: true
        });
        agentByAddress[agentAddress] = id;
        agentByDomain[domain] = id;
        emit AgentRegistered(id, agentAddress, domain, agentType);
    }

    function updateAgent(uint256 id, string calldata domain, bytes32 metadataHash) external {
        require(agents[id].agentAddress == msg.sender, "not agent owner");
        delete agentByDomain[agents[id].domain];
        agents[id].domain = domain;
        agents[id].metadataHash = metadataHash;
        agentByDomain[domain] = id;
        emit AgentUpdated(id, domain, metadataHash);
    }

    function deactivateAgent(uint256 id) external {
        require(agents[id].agentAddress == msg.sender || msg.sender == owner(), "unauthorized");
        agents[id].active = false;
        emit AgentDeactivated(id);
    }

    function getAgent(uint256 id) external view returns (Agent memory) { return agents[id]; }
    function getAgentByAddress(address a) external view returns (Agent memory) { return agents[agentByAddress[a]]; }
    function totalAgents() external view returns (uint256) { return _nextId - 1; }
}
