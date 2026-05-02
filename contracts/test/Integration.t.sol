// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/AuditAttestation.sol";

/// @notice Integration test: AgentRegistry + AuditAttestation cross-contract flow
contract IntegrationTest is Test {
    AgentRegistry public registry;
    AuditAttestation public attestation;
    address public deployer = address(this);
    address public auditor = address(0x1);

    function setUp() public {
        registry = new AgentRegistry();
        attestation = new AuditAttestation();
        attestation.authorizeAuditor(auditor);
    }

    /// @notice Full flow: register 4 agents, then attest an audit for a contract
    function testFullAuditFlow() public {
        // Register 4 agents
        bytes32[] memory peerIds = new bytes32[](4);
        peerIds[0] = keccak256("reentrancy");
        peerIds[1] = keccak256("access-control");
        peerIds[2] = keccak256("logic");
        peerIds[3] = keccak256("economic");

        string[4] memory names = ["reentrancy", "access-control", "logic", "economic"];
        string[4] memory capabilities = ["reentrancy-scan", "access-control-scan", "logic-scan", "economic-scan"];

        for (uint256 i = 0; i < 4; i++) {
            registry.registerAgent(names[i], capabilities[i], peerIds[i]);
        }

        assertEq(registry.getAgentCount(), 4);
        assertEq(registry.activeCount(), 4);

        // Now attest audit findings for a target contract
        address target = address(0xBEEF);
        vm.prank(auditor);
        bytes32 attestId = attestation.attest(
            target,
            keccak256("findings-hash"),
            keccak256("storage-root"),
            1, // 1 critical
            2  // 2 high
        );

        // Verify attestation recorded correctly
        AuditAttestation.Attestation memory a = attestation.getAttestation(attestId);
        assertEq(a.contractAudited, target);
        assertEq(a.criticalCount, 1);
        assertEq(a.highCount, 2);
        assertEq(a.auditor, auditor);
        assertEq(attestation.getAttestationCount(), 1);

        // Verify agents still active
        for (uint256 i = 0; i < 4; i++) {
            AgentRegistry.AgentInfo memory agent = registry.getAgent(peerIds[i]);
            assertTrue(agent.active);
        }
    }

    /// @notice Test: deactivated agent owner can still attest (authorization is separate)
    function testDeactivatedAgentCanStillAttest() public {
        bytes32 peerId = keccak256("test-agent");
        registry.registerAgent("test", "test-cap", peerId);
        assertEq(registry.getAgentCount(), 1);

        // Deactivate agent
        registry.deactivateAgent(peerId);
        assertEq(registry.getAgentCount(), 0);

        // Attestation still works since auth is separate from registry
        attestation.authorizeAuditor(deployer);
        bytes32 id = attestation.attest(
            address(0xCAFE),
            keccak256("findings"),
            keccak256("storage"),
            0, 0
        );
        assertEq(attestation.getAttestationCount(), 1);
    }

    /// @notice Test: multiple attestations from different auditors
    function testMultipleAuditorAttestations() public {
        address auditor2 = address(0x2);
        attestation.authorizeAuditor(auditor2);

        vm.prank(auditor);
        bytes32 id1 = attestation.attest(
            address(0xBEEF),
            keccak256("findings-1"),
            keccak256("storage-1"),
            1, 0
        );

        vm.prank(auditor2);
        bytes32 id2 = attestation.attest(
            address(0xBEEF),
            keccak256("findings-2"),
            keccak256("storage-2"),
            0, 1
        );

        assertEq(attestation.getAttestationCount(), 2);

        AuditAttestation.Attestation memory a1 = attestation.getAttestation(id1);
        AuditAttestation.Attestation memory a2 = attestation.getAttestation(id2);
        assertEq(a1.auditor, auditor);
        assertEq(a2.auditor, auditor2);
    }

    /// @notice Test: revoking an auditor blocks future attestations
    function testRevokedAuditorBlocked() public {
        vm.prank(auditor);
        attestation.attest(address(0xBEEF), keccak256("f1"), keccak256("s1"), 0, 0);
        assertEq(attestation.getAttestationCount(), 1);

        // Revoke auditor
        attestation.revokeAuditor(auditor);

        // Should now fail
        vm.prank(auditor);
        vm.expectRevert("Not authorized auditor");
        attestation.attest(address(0xCAFE), keccak256("f2"), keccak256("s2"), 0, 0);
    }

    /// @notice Test: re-registering a deactivated agent increments count correctly
    function testReRegisterAgent() public {
        bytes32 peerId = keccak256("agent-1");
        registry.registerAgent("agent", "cap", peerId);
        assertEq(registry.getAgentCount(), 1);

        registry.deactivateAgent(peerId);
        assertEq(registry.getAgentCount(), 0);

        // Re-register same peerId
        registry.registerAgent("agent-v2", "cap-v2", peerId);
        assertEq(registry.getAgentCount(), 1);

        AgentRegistry.AgentInfo memory info = registry.getAgent(peerId);
        assertEq(info.name, "agent-v2");
        assertTrue(info.active);
    }
}
