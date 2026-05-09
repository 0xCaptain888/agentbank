// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract LLMReasoningRegistry {

    struct ReasoningRecord {
        bytes32 id;
        bytes32 parentHash;
        address agent;
        string  model;
        bytes32 promptHash;
        bytes32 outputHash;
        string  storageURI;
        uint256 timestamp;
    }

    mapping(bytes32 => ReasoningRecord) public records;
    mapping(address => bytes32) public latestForAgent;
    bytes32[] public allRecords;

    event ReasoningRecorded(
        bytes32 indexed id,
        bytes32 indexed parentHash,
        address indexed agent,
        string model,
        bytes32 promptHash,
        bytes32 outputHash,
        string storageURI
    );

    function record(
        string calldata model,
        bytes32 promptHash,
        bytes32 outputHash,
        string calldata storageURI
    ) external returns (bytes32 id) {
        bytes32 parent = latestForAgent[msg.sender];
        id = keccak256(abi.encode(parent, msg.sender, model, promptHash, outputHash, storageURI, block.timestamp));
        records[id] = ReasoningRecord({
            id: id,
            parentHash: parent,
            agent: msg.sender,
            model: model,
            promptHash: promptHash,
            outputHash: outputHash,
            storageURI: storageURI,
            timestamp: block.timestamp
        });
        latestForAgent[msg.sender] = id;
        allRecords.push(id);
        emit ReasoningRecorded(id, parent, msg.sender, model, promptHash, outputHash, storageURI);
    }

    function verifyChain(bytes32 fromId, bytes32 toId) external view returns (bool) {
        bytes32 cur = toId;
        while (cur != bytes32(0)) {
            if (cur == fromId) return true;
            cur = records[cur].parentHash;
        }
        return false;
    }

    function totalRecords() external view returns (uint256) { return allRecords.length; }
}
