// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/AuditAttestation.sol";

/// @notice Edge case tests for contract public/external functions
contract EdgeCaseTest is Test {
    AgentRegistry public registry;
    AuditAttestation public attestation;

    function setUp() public {
        registry = new AgentRegistry();
        attestation = new AuditAttestation();
    }

    // ========== AgentRegistry Edge Cases ==========

    function testRegisterWithZeroPeerId() public {
        vm.expectRevert("PeerId required");
        registry.registerAgent("name", "cap", bytes32(0));
    }

    function testRegisterWithEmptyCapability() public {
        vm.expectRevert("Capability required");
        registry.registerAgent("name", "", keccak256("id"));
    }

    function testDeactivateNonExistentAgent() public {
        vm.expectRevert("Not owner");
        registry.deactivateAgent(keccak256("nonexistent"));
    }

    function testDeactivateAlreadyInactive() public {
        bytes32 peerId = keccak256("agent");
        registry.registerAgent("name", "cap", peerId);
        registry.deactivateAgent(peerId);
        vm.expectRevert("Not active");
        registry.deactivateAgent(peerId);
    }

    function testDeactivateByNonOwner() public {
        bytes32 peerId = keccak256("agent");
        registry.registerAgent("name", "cap", peerId);

        vm.prank(address(0xDEAD));
        vm.expectRevert("Not owner");
        registry.deactivateAgent(peerId);
    }

    function testGetAllAgentsEmpty() public view {
        AgentRegistry.AgentInfo[] memory agents = registry.getAllAgents();
        assertEq(agents.length, 0);
    }

    function testGetAgentByAddressNoMatch() public view {
        AgentRegistry.AgentInfo memory info = registry.getAgent(address(0xDEAD));
        assertEq(info.owner, address(0));
        assertFalse(info.active);
    }

    function testPaginationBeyondBounds() public {
        bytes32 peerId = keccak256("agent");
        registry.registerAgent("name", "cap", peerId);

        AgentRegistry.AgentInfo[] memory result = registry.getAgentsPaginated(100, 10);
        assertEq(result.length, 0);
    }

    function testPaginationLimitTooLarge() public {
        vm.expectRevert("Limit too large");
        registry.getAgentsPaginated(0, 101);
    }

    function testPaginationLimitExact100() public view {
        // Should not revert with exactly 100
        registry.getAgentsPaginated(0, 100);
    }

    // ========== AuditAttestation Edge Cases ==========

    function testAttestZeroAddress() public {
        attestation.authorizeAuditor(address(this));
        vm.expectRevert("Invalid contract address");
        attestation.attest(address(0), keccak256("f"), keccak256("s"), 0, 0);
    }

    function testAttestZeroFindingsHash() public {
        attestation.authorizeAuditor(address(this));
        vm.expectRevert("Findings hash required");
        attestation.attest(address(0xBEEF), bytes32(0), keccak256("s"), 0, 0);
    }

    function testAuthorizeZeroAddress() public {
        vm.expectRevert("Invalid auditor address");
        attestation.authorizeAuditor(address(0));
    }

    function testNonOwnerCannotAuthorize() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not owner");
        attestation.authorizeAuditor(address(0x1));
    }

    function testNonOwnerCannotRevoke() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert("Not owner");
        attestation.revokeAuditor(address(0x1));
    }

    function testGetNonExistentAttestation() public {
        vm.expectRevert("Attestation not found");
        attestation.getAttestation(keccak256("nonexistent"));
    }

    function testGetLatestAttestationsEmpty() public view {
        AuditAttestation.Attestation[] memory result = attestation.getLatestAttestations(5);
        assertEq(result.length, 0);
    }

    function testGetLatestAttestationsMoreThanExist() public {
        attestation.authorizeAuditor(address(this));
        attestation.attest(address(0xBEEF), keccak256("f"), keccak256("s"), 0, 0);

        AuditAttestation.Attestation[] memory result = attestation.getLatestAttestations(10);
        assertEq(result.length, 1);
    }

    function testMaxUint8SeverityCounts() public {
        attestation.authorizeAuditor(address(this));
        bytes32 id = attestation.attest(
            address(0xBEEF),
            keccak256("f"),
            keccak256("s"),
            type(uint8).max, // 255 criticals
            type(uint8).max  // 255 highs
        );

        AuditAttestation.Attestation memory a = attestation.getAttestation(id);
        assertEq(a.criticalCount, 255);
        assertEq(a.highCount, 255);
    }
}
