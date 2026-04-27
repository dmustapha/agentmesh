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

    function attest(
        address contractAudited,
        bytes32 findingsHash,
        bytes32 storageRootHash,
        uint8 criticalCount,
        uint8 highCount
    ) external returns (bytes32) {
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
