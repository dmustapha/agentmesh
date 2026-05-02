// File: packages/frontend/src/components/TopologyGraph.tsx
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { AgentNode, AXLMessage } from '@agentmesh/shared';
import { SPECIALTY_COLORS } from '@/lib/agent-colors';

interface TopologyGraphProps {
  agents: AgentNode[];
  topology: Record<string, { peerId: string; peers: string[] }>;
  messages?: AXLMessage[];
}

const SPECIALTY_ICONS: Record<string, string> = {
  reentrancy: 'R',
  'access-control': 'A',
  logic: 'L',
  economic: 'E',
};

export function TopologyGraph({ agents, topology, messages = [] }: TopologyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const render = useCallback(() => {
    if (!svgRef.current || agents.length === 0) return;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use viewBox for responsive scaling — aspect ratio 3:2
    const width = 720;
    const height = 480;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg.append('defs');

    // Center glow — gold
    const radialGrad = defs.append('radialGradient')
      .attr('id', 'center-glow')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    radialGrad.append('stop').attr('offset', '0%').attr('stop-color', '#D4A853').attr('stop-opacity', 0.08);
    radialGrad.append('stop').attr('offset', '60%').attr('stop-color', '#D4A853').attr('stop-opacity', 0.02);
    radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#D4A853').attr('stop-opacity', 0);

    // Secondary glow — purple
    const radialGrad2 = defs.append('radialGradient')
      .attr('id', 'center-glow-2')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '40%');
    radialGrad2.append('stop').attr('offset', '0%').attr('stop-color', '#7850C8').attr('stop-opacity', 0.05);
    radialGrad2.append('stop').attr('offset', '100%').attr('stop-color', '#7850C8').attr('stop-opacity', 0);

    // Node glow filters per specialty
    for (const [specialty, color] of Object.entries(SPECIALTY_COLORS)) {
      const filter = defs.append('filter')
        .attr('id', `glow-${specialty}`)
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%');
      filter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
      filter.append('feFlood').attr('flood-color', color).attr('flood-opacity', '0.5').attr('result', 'color');
      filter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'glow');
      merge.append('feMergeNode').attr('in', 'glow');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Line glow filter
    const lineGlow = defs.append('filter').attr('id', 'line-glow');
    lineGlow.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
    const lineM = lineGlow.append('feMerge');
    lineM.append('feMergeNode').attr('in', 'blur');
    lineM.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background layers
    const bgGroup = svg.append('g').attr('class', 'bg-layer');
    bgGroup.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2).attr('r', 180)
      .attr('fill', 'url(#center-glow)');
    bgGroup.append('circle')
      .attr('cx', width / 2 + 30).attr('cy', height / 2 - 20).attr('r', 140)
      .attr('fill', 'url(#center-glow-2)');

    // Orbital rings — gold/purple
    bgGroup.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2).attr('r', 155)
      .attr('fill', 'none')
      .attr('stroke', '#D4A853')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,8')
      .attr('opacity', 0.15);

    bgGroup.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2).attr('r', 100)
      .attr('fill', 'none')
      .attr('stroke', '#7850C8')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '1,12')
      .attr('opacity', 0.1);

    // Compute node positions
    const nodes = agents.map((a, i) => ({
      id: a.peerId,
      agentId: a.id,
      name: a.ensName.split('.')[0],
      specialty: a.specialty,
      status: a.status,
      x: width / 2 + Math.cos((i * 2 * Math.PI) / agents.length - Math.PI / 2) * 155,
      y: height / 2 + Math.sin((i * 2 * Math.PI) / agents.length - Math.PI / 2) * 135,
    }));

    // Active senders
    const now = Date.now();
    const recentSenderIds = new Set(
      messages.filter((m) => now - m.timestamp < 5000).map((m) => m.fromAgent),
    );
    const activePeerIds = new Set(
      nodes.filter((n) => recentSenderIds.has(n.agentId)).map((n) => n.id),
    );

    // Build links
    const links: Array<{ source: string; target: string }> = [];
    const linkSet = new Set<string>();
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const [, data] of Object.entries(topology)) {
      if (!data?.peerId || !nodeIds.has(data.peerId)) continue;
      for (const peer of data.peers || []) {
        if (!nodeIds.has(peer)) continue;
        const key = [data.peerId, peer].sort().join('-');
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: data.peerId, target: peer });
        }
      }
    }
    if (links.length === 0) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          links.push({ source: nodes[i].id, target: nodes[j].id });
        }
      }
    }

    // Draw links with data flow
    const linkGroup = svg.append('g').attr('class', 'links');

    links.forEach((link, idx) => {
      const src = nodes.find((n) => n.id === link.source);
      const tgt = nodes.find((n) => n.id === link.target);
      if (!src || !tgt) return;

      const isActive = activePeerIds.has(link.source) || activePeerIds.has(link.target);

      linkGroup.append('line')
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', isActive ? '#D4A853' : '#2A2540')
        .attr('stroke-width', isActive ? 1.5 : 0.5)
        .attr('stroke-dasharray', isActive ? '' : '4,6')
        .attr('opacity', isActive ? 0.6 : 0.3)
        .attr('filter', isActive ? 'url(#line-glow)' : null);

      if (isActive) {
        const particle = linkGroup.append('circle')
          .attr('r', 2)
          .attr('fill', '#F0C060')
          .attr('opacity', 0.8);

        const animateParticle = () => {
          particle
            .attr('cx', src.x).attr('cy', src.y).attr('opacity', 0)
            .transition()
            .delay(idx * 400)
            .duration(0)
            .attr('opacity', 0.8)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('cx', tgt.x).attr('cy', tgt.y)
            .transition()
            .duration(0)
            .attr('opacity', 0)
            .on('end', animateParticle);
        };
        animateParticle();
      }
    });

    // Draw nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    nodes.forEach((node, i) => {
      const color = SPECIALTY_COLORS[node.specialty] || '#D4A853';
      const isActive = node.status !== 'idle';
      const isComm = activePeerIds.has(node.id);
      const g = nodeGroup.append('g')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('class', 'node-group')
        .style('cursor', 'pointer');

      // Outer pulse ring
      if (isActive || isComm) {
        g.append('circle')
          .attr('r', 36)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '28;42')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');

        g.select('circle:last-of-type')
          .append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '0.4;0')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');

        const ring2 = g.append('circle')
          .attr('r', 28)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 0.5)
          .attr('opacity', 0);

        ring2.append('animate')
          .attr('attributeName', 'r')
          .attr('values', '28;46')
          .attr('dur', '2s')
          .attr('begin', '1s')
          .attr('repeatCount', 'indefinite');

        ring2.append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '0.3;0')
          .attr('dur', '2s')
          .attr('begin', '1s')
          .attr('repeatCount', 'indefinite');
      }

      // Halo ring
      g.append('circle')
        .attr('r', 36)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 12)
        .attr('opacity', 0.08);

      // Dashed orbit ring
      g.append('circle')
        .attr('r', 34)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '3,5')
        .attr('opacity', isActive ? 0.4 : 0.15);

      // Node background circle
      g.append('circle')
        .attr('r', 24)
        .attr('fill', color + '15')
        .attr('stroke', color)
        .attr('stroke-width', isActive ? 2 : 1.5)
        .attr('filter', isActive ? `url(#glow-${node.specialty})` : null)
        .style('transition', 'all 0.3s ease');

      // Inner circle
      g.append('circle')
        .attr('r', 12)
        .attr('fill', color + '20')
        .attr('opacity', 0.5);

      // Icon letter
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', color)
        .attr('font-size', 13)
        .attr('font-weight', '700')
        .attr('font-family', 'var(--font-mono), monospace')
        .attr('letter-spacing', '0.5')
        .text(SPECIALTY_ICONS[node.specialty] || node.name[0].toUpperCase());

      // Name label
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 46)
        .attr('fill', '#EDE8DE')
        .attr('font-size', 11)
        .attr('font-weight', '600')
        .attr('font-family', 'var(--font-inter), sans-serif')
        .text(node.name);

      // Status label
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 60)
        .attr('fill', isActive ? color : '#6E6A7A')
        .attr('font-size', 8)
        .attr('font-weight', '500')
        .attr('font-family', 'var(--font-mono), monospace')
        .attr('letter-spacing', '0.5')
        .text(node.status.toUpperCase());

      // Entrance animation
      g.attr('opacity', 0)
        .attr('transform', `translate(${width / 2}, ${height / 2}) scale(0.3)`)
        .transition()
        .delay(i * 150)
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1)
        .attr('transform', `translate(${node.x}, ${node.y}) scale(1)`);
    });

    // Center hub
    const centerGroup = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Rotating dashed ring — gold
    centerGroup.append('circle')
      .attr('r', 40)
      .attr('fill', 'none')
      .attr('stroke', '#D4A853')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,6')
      .attr('opacity', 0.2)
      .append('animateTransform')
      .attr('attributeName', 'transform')
      .attr('type', 'rotate')
      .attr('values', '0;360')
      .attr('dur', '30s')
      .attr('repeatCount', 'indefinite');

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('fill', '#D4A853')
      .attr('font-size', 9)
      .attr('font-weight', '700')
      .attr('font-family', 'var(--font-mono), monospace')
      .attr('letter-spacing', '2.5')
      .text('AXL MESH');

    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 10)
      .attr('fill', '#6E6A7A')
      .attr('font-size', 7)
      .attr('font-family', 'var(--font-mono), monospace')
      .attr('letter-spacing', '1')
      .text('GENSYN P2P');

  }, [agents, topology, messages]);

  useEffect(() => {
    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  return (
    <div className="glass-card overflow-hidden scan-overlay topology-container">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            Mesh Topology
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-mesh-green animate-pulse" />
          </h2>
          <p className="text-[11px] text-mesh-muted mt-0.5 font-mono">Real-time P2P agent network</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-mesh-bg/50 border border-mesh-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-mesh-green" />
            <span className="text-[10px] text-mesh-muted font-mono">{agents.length} nodes</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-mesh-bg/50 border border-mesh-border/50">
            <span className="text-[10px] text-mesh-muted font-mono">
              {Object.values(topology).reduce((acc, t) => acc + (t.peers?.length || 0), 0)} links
            </span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative z-10">
        <svg ref={svgRef} className="w-full h-auto" />
      </div>

      {/* Legend bar */}
      <div className="px-5 pb-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5">
          {Object.entries(SPECIALTY_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5 group">
              <span
                className="w-2.5 h-2.5 rounded-full transition-transform duration-300 group-hover:scale-125"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
              />
              <span className="text-[10px] text-mesh-muted capitalize group-hover:text-gray-400 transition-colors duration-300">
                {name.replace('-', ' ')}
              </span>
            </div>
          ))}
        </div>
        <span className="text-[9px] text-mesh-muted-dim font-mono">
          {messages.filter((m) => Date.now() - m.timestamp < 5000).length > 0 ? 'TRANSMITTING' : 'STANDBY'}
        </span>
      </div>
    </div>
  );
}
