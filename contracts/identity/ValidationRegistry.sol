// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./IdentityRegistry.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 §3 — agents request validation of their work,
 *         registered validators respond with attestations.
 */
contract ValidationRegistry {

    IdentityRegistry public immutable identity;

    enum Status { Pending, Valid, Invalid, Expired }

    struct Request {
        bytes32 id;
        uint256 requesterAgentId;
        uint256 validatorAgentId;
        bytes32 dataHash;
        uint256 stake;
        Status  status;
        string  evidenceURI;
        uint256 createdAt;
        uint256 respondedAt;
        bytes32 responseHash;
    }

    mapping(bytes32 => Request) public requests;
    bytes32[] public requestIds;

    mapping(uint256 => uint256) public totalValidationsRequested;
    mapping(uint256 => uint256) public totalValidationsPassed;
    mapping(uint256 => uint256) public totalValidationsFailed;

    event ValidationRequested(bytes32 indexed id, uint256 requester, uint256 validator, bytes32 dataHash);
    event ValidationResponded(bytes32 indexed id, Status status, bytes32 responseHash);

    constructor(address _identity) { identity = IdentityRegistry(_identity); }

    function requestValidation(
        address requesterAddr,
        address validatorAddr,
        bytes32 dataHash,
        uint256 stake
    ) external payable returns (bytes32 id) {
        uint256 reqId = identity.agentByAddress(requesterAddr);
        uint256 valId = identity.agentByAddress(validatorAddr);
        require(reqId != 0 && valId != 0, "unregistered agent");
        require(msg.value == stake, "stake mismatch");

        id = keccak256(abi.encodePacked(requesterAddr, validatorAddr, dataHash, block.timestamp, requestIds.length));
        requests[id] = Request({
            id: id,
            requesterAgentId: reqId,
            validatorAgentId: valId,
            dataHash: dataHash,
            stake: stake,
            status: Status.Pending,
            evidenceURI: "",
            createdAt: block.timestamp,
            respondedAt: 0,
            responseHash: bytes32(0)
        });
        requestIds.push(id);
        totalValidationsRequested[reqId]++;
        emit ValidationRequested(id, reqId, valId, dataHash);
    }

    function respondValidation(
        bytes32 id,
        Status status,
        bytes32 responseHash,
        string calldata evidenceURI
    ) external {
        Request storage r = requests[id];
        require(r.status == Status.Pending, "not pending");
        require(identity.getAgent(r.validatorAgentId).agentAddress == msg.sender, "not validator");
        require(status == Status.Valid || status == Status.Invalid, "invalid status");

        r.status = status;
        r.responseHash = responseHash;
        r.evidenceURI = evidenceURI;
        r.respondedAt = block.timestamp;

        if (status == Status.Valid) {
            totalValidationsPassed[r.requesterAgentId]++;
            if (r.stake > 0) payable(identity.getAgent(r.requesterAgentId).agentAddress).transfer(r.stake);
        } else {
            totalValidationsFailed[r.requesterAgentId]++;
            if (r.stake > 0) {
                payable(msg.sender).transfer(r.stake / 2);
            }
        }
        emit ValidationResponded(id, status, responseHash);
    }

    function getValidationStats(uint256 agentId) external view returns (
        uint256 requested, uint256 passed, uint256 failed, uint256 passRate
    ) {
        requested = totalValidationsRequested[agentId];
        passed   = totalValidationsPassed[agentId];
        failed   = totalValidationsFailed[agentId];
        passRate = requested == 0 ? 0 : (passed * 10_000) / requested;
    }

    function totalRequests() external view returns (uint256) { return requestIds.length; }
}
