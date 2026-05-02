// Tests for TopologyGraph component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopologyGraph } from './TopologyGraph';
import type { AgentNode, AXLMessage } from '@agentmesh/shared';

// Mock d3 SVG rendering (jsdom doesn't support SVG layout)
// We test that the component renders without crashing and shows correct metadata
const mockAgents: AgentNode[] = [
  {
    id: 'agent-1',
    peerId: 'peer-1',
    ensName: 'reentrancy.agentmesh.eth',
    specialty: 'reentrancy',
    capabilities: ['reentrancy'],
    status: 'idle',
    axlPort: 9002,
  },
  {
    id: 'agent-2',
    peerId: 'peer-2',
    ensName: 'access.agentmesh.eth',
    specialty: 'access-control',
    capabilities: ['access-control'],
    status: 'analyzing',
    axlPort: 9003,
  },
  {
    id: 'agent-3',
    peerId: 'peer-3',
    ensName: 'logic.agentmesh.eth',
    specialty: 'logic',
    capabilities: ['logic'],
    status: 'idle',
    axlPort: 9004,
  },
  {
    id: 'agent-4',
    peerId: 'peer-4',
    ensName: 'economic.agentmesh.eth',
    specialty: 'economic',
    capabilities: ['economic'],
    status: 'idle',
    axlPort: 9005,
  },
];

const mockTopology: Record<string, { peerId: string; peers: string[] }> = {
  reentrancy: { peerId: 'peer-1', peers: ['peer-2', 'peer-3', 'peer-4'] },
  'access-control': { peerId: 'peer-2', peers: ['peer-1'] },
  logic: { peerId: 'peer-3', peers: ['peer-1'] },
  economic: { peerId: 'peer-4', peers: ['peer-1'] },
};

describe('TopologyGraph', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TopologyGraph agents={mockAgents} topology={mockTopology} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('displays node count', () => {
    render(<TopologyGraph agents={mockAgents} topology={mockTopology} />);
    expect(screen.getByText('4 nodes')).toBeInTheDocument();
  });

  it('displays connection count', () => {
    render(<TopologyGraph agents={mockAgents} topology={mockTopology} />);
    // Total peers: 3 + 1 + 1 + 1 = 6
    expect(screen.getByText('6 links')).toBeInTheDocument();
  });

  it('shows title and subtitle', () => {
    render(<TopologyGraph agents={mockAgents} topology={mockTopology} />);
    expect(screen.getByText('Mesh Topology')).toBeInTheDocument();
    expect(screen.getByText(/Real-time P2P/)).toBeInTheDocument();
  });

  it('renders specialty legends', () => {
    render(<TopologyGraph agents={mockAgents} topology={mockTopology} />);
    // Legend labels appear in the bottom bar (may also appear in SVG node labels)
    const legends = document.querySelectorAll('.text-\\[10px\\].text-mesh-muted.capitalize');
    const legendTexts = Array.from(legends).map(el => el.textContent);
    expect(legendTexts).toContain('reentrancy');
    expect(legendTexts).toContain('access control');
    expect(legendTexts).toContain('logic');
    expect(legendTexts).toContain('economic');
  });

  it('handles empty agents array', () => {
    const { container } = render(
      <TopologyGraph agents={[]} topology={{}} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('0 nodes')).toBeInTheDocument();
  });

  it('handles messages prop', () => {
    const messages: AXLMessage[] = [
      {
        type: 'finding',
        payload: {},
        fromAgent: 'agent-1',
        toAgent: 'agent-2',
        timestamp: Date.now(),
      },
    ];

    const { container } = render(
      <TopologyGraph agents={mockAgents} topology={mockTopology} messages={messages} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
