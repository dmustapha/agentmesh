// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgentRegistry {
    struct AgentInfo {
        address owner;
        string name;
        string capability;
        bytes32 peerId;
        uint256 registeredAt;
        bool active;
    }

    // Key by peerId so multiple agents can be registered from the same wallet
    mapping(bytes32 => AgentInfo) public agents;
    bytes32[] public agentList;
    uint256 public activeCount;

    event AgentRegistered(address indexed owner, string name, string capability, bytes32 peerId);
    event AgentDeactivated(address indexed owner, bytes32 peerId);

    function registerAgent(
        string calldata name,
        string calldata capability,
        bytes32 peerId
    ) external {
        require(bytes(name).length > 0, "Name required");
        require(bytes(capability).length > 0, "Capability required");
        require(peerId != bytes32(0), "PeerId required");

        bool isNew = !agents[peerId].active && agents[peerId].registeredAt == 0;
        bool wasInactive = agents[peerId].registeredAt > 0 && !agents[peerId].active;

        if (isNew) {
            agentList.push(peerId);
        }

        agents[peerId] = AgentInfo({
            owner: msg.sender,
            name: name,
            capability: capability,
            peerId: peerId,
            registeredAt: block.timestamp,
            active: true
        });

        if (isNew || wasInactive) {
            activeCount++;
        }

        emit AgentRegistered(msg.sender, name, capability, peerId);
    }

    function deactivateAgent(bytes32 peerId) external {
        require(agents[peerId].owner == msg.sender, "Not owner");
        require(agents[peerId].active, "Not active");
        agents[peerId].active = false;
        activeCount--;
        emit AgentDeactivated(msg.sender, peerId);
    }

    function getAgent(bytes32 peerId) external view returns (AgentInfo memory) {
        return agents[peerId];
    }

    // Keep backward-compatible overload for address lookup (returns first active agent owned by address)
    function getAgent(address owner) external view returns (AgentInfo memory) {
        for (uint256 i = 0; i < agentList.length; i++) {
            if (agents[agentList[i]].owner == owner && agents[agentList[i]].active) {
                return agents[agentList[i]];
            }
        }
        return AgentInfo(address(0), "", "", bytes32(0), 0, false);
    }

    function getAllAgents() external view returns (AgentInfo[] memory) {
        AgentInfo[] memory result = new AgentInfo[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < agentList.length; i++) {
            if (agents[agentList[i]].active) {
                result[idx] = agents[agentList[i]];
                idx++;
            }
        }
        return result;
    }

    function getAgentsPaginated(uint256 offset, uint256 limit) external view returns (AgentInfo[] memory) {
        require(limit <= 100, "Limit too large");
        uint256 total = agentList.length;
        if (offset >= total) {
            return new AgentInfo[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 count = end - offset;
        AgentInfo[] memory result = new AgentInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = agents[agentList[offset + i]];
        }
        return result;
    }

    function getAgentCount() external view returns (uint256) {
        return activeCount;
    }
}
