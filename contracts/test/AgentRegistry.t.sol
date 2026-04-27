// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);
    bytes32 public peerId1 = bytes32(uint256(1));
    bytes32 public peerId2 = bytes32(uint256(2));

    function setUp() public {
        registry = new AgentRegistry();
    }

    function testRegisterAgent() public {
        vm.prank(agent1);
        registry.registerAgent("ReentrancyAgent", "reentrancy", peerId1);

        AgentRegistry.AgentInfo memory info = registry.getAgent(peerId1);
        assertEq(info.name, "ReentrancyAgent");
        assertEq(info.capability, "reentrancy");
        assertTrue(info.active);
        assertEq(info.owner, agent1);
    }

    function testMultipleAgentsSameWallet() public {
        // Critical fix: same wallet can register multiple agents via different peerIds
        vm.startPrank(agent1);
        registry.registerAgent("Agent1", "reentrancy", peerId1);
        registry.registerAgent("Agent2", "access-control", peerId2);
        vm.stopPrank();

        AgentRegistry.AgentInfo memory info1 = registry.getAgent(peerId1);
        AgentRegistry.AgentInfo memory info2 = registry.getAgent(peerId2);
        assertEq(info1.name, "Agent1");
        assertEq(info2.name, "Agent2");
        assertEq(registry.getAgentCount(), 2);
    }

    function testGetAllAgents() public {
        vm.prank(agent1);
        registry.registerAgent("Agent1", "reentrancy", peerId1);
        vm.prank(agent2);
        registry.registerAgent("Agent2", "access-control", peerId2);

        AgentRegistry.AgentInfo[] memory agents = registry.getAllAgents();
        assertEq(agents.length, 2);
    }

    function testDeactivateAgent() public {
        vm.prank(agent1);
        registry.registerAgent("Agent1", "reentrancy", peerId1);
        vm.prank(agent1);
        registry.deactivateAgent(peerId1);

        AgentRegistry.AgentInfo memory info = registry.getAgent(peerId1);
        assertFalse(info.active);
        assertEq(registry.getAgentCount(), 0);
    }

    function testDeactivateNotOwnerReverts() public {
        vm.prank(agent1);
        registry.registerAgent("Agent1", "reentrancy", peerId1);
        vm.prank(agent2);
        vm.expectRevert("Not owner");
        registry.deactivateAgent(peerId1);
    }

    function testGetAgentByAddress() public {
        vm.prank(agent1);
        registry.registerAgent("Agent1", "reentrancy", peerId1);

        AgentRegistry.AgentInfo memory info = registry.getAgent(agent1);
        assertEq(info.name, "Agent1");
    }

    function testRevertEmptyName() public {
        vm.prank(agent1);
        vm.expectRevert("Name required");
        registry.registerAgent("", "reentrancy", peerId1);
    }
}
