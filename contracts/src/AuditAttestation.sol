// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AuditAttestation {
    struct Attestation {
        bytes32 id;
        address contractAudited;
        bytes32 findingsHash;
        bytes32 storageRootHash;
        uint8 criticalCount;
        uint8 highCount;
        address auditor;
        uint256 timestamp;
    }

    address public owner;
    mapping(address => bool) public authorizedAuditors;
    mapping(bytes32 => Attestation) public attestations;
    bytes32[] public attestationIds;

    event AuditAttested(
        bytes32 indexed id,
        address indexed contractAudited,
        bytes32 findingsHash,
        bytes32 storageRootHash,
        uint8 criticalCount,
        uint8 highCount
    );

    event AuditorAuthorized(address indexed auditor);
    event AuditorRevoked(address indexed auditor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedAuditors[msg.sender] || msg.sender == owner, "Not authorized auditor");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Owner is automatically an authorized auditor
        authorizedAuditors[msg.sender] = true;
    }

    function authorizeAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "Invalid auditor address");
        authorizedAuditors[auditor] = true;
        emit AuditorAuthorized(auditor);
    }

    function revokeAuditor(address auditor) external onlyOwner {
        authorizedAuditors[auditor] = false;
        emit AuditorRevoked(auditor);
    }

    function attest(
        address contractAudited,
        bytes32 findingsHash,
        bytes32 storageRootHash,
        uint8 criticalCount,
        uint8 highCount
    ) external onlyAuthorized returns (bytes32) {
        require(contractAudited != address(0), "Invalid contract address");
        require(findingsHash != bytes32(0), "Findings hash required");

        bytes32 id = keccak256(
            abi.encodePacked(contractAudited, findingsHash, msg.sender, block.timestamp)
        );

        attestations[id] = Attestation({
            id: id,
            contractAudited: contractAudited,
            findingsHash: findingsHash,
            storageRootHash: storageRootHash,
            criticalCount: criticalCount,
            highCount: highCount,
            auditor: msg.sender,
            timestamp: block.timestamp
        });

        attestationIds.push(id);

        emit AuditAttested(id, contractAudited, findingsHash, storageRootHash, criticalCount, highCount);

        return id;
    }

    function getAttestation(bytes32 id) external view returns (Attestation memory) {
        require(attestations[id].timestamp > 0, "Attestation not found");
        return attestations[id];
    }

    function getAttestationCount() external view returns (uint256) {
        return attestationIds.length;
    }

    function getLatestAttestations(uint256 count) external view returns (Attestation[] memory) {
        uint256 len = attestationIds.length;
        uint256 resultCount = count > len ? len : count;
        Attestation[] memory result = new Attestation[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = attestations[attestationIds[len - 1 - i]];
        }
        return result;
    }
}
