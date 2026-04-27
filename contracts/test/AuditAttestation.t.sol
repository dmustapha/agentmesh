// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AuditAttestation.sol";

contract AuditAttestationTest is Test {
    AuditAttestation public attestation;
    address public auditor = address(0x1);
    address public targetContract = address(0xBEEF);

    function setUp() public {
        attestation = new AuditAttestation();
    }

    function testAttest() public {
        vm.prank(auditor);
        bytes32 id = attestation.attest(
            targetContract,
            keccak256("findings"),
            keccak256("storage"),
            1, // 1 critical
            2  // 2 high
        );

        AuditAttestation.Attestation memory a = attestation.getAttestation(id);
        assertEq(a.contractAudited, targetContract);
        assertEq(a.criticalCount, 1);
        assertEq(a.highCount, 2);
        assertEq(a.auditor, auditor);
    }

    function testGetAttestationCount() public {
        vm.prank(auditor);
        attestation.attest(targetContract, keccak256("f1"), keccak256("s1"), 0, 0);
        assertEq(attestation.getAttestationCount(), 1);
    }

    function testRevertInvalidAddress() public {
        vm.prank(auditor);
        vm.expectRevert("Invalid contract address");
        attestation.attest(address(0), keccak256("f"), keccak256("s"), 0, 0);
    }
}
