// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/AuditAttestation.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        AgentRegistry registry = new AgentRegistry();
        AuditAttestation attestation = new AuditAttestation();

        vm.stopBroadcast();

        console.log("AgentRegistry deployed at:", address(registry));
        console.log("AuditAttestation deployed at:", address(attestation));
    }
}
