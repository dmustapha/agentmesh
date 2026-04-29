// File: packages/backend/src/agents/agent.ts

import {
  AgentNode,
  AgentSpecialty,
  AgentStatus,
  AXLMessage,
  Finding,
  Vote,
} from '@agentmesh/shared';
import { AGENT_SYSTEM_PROMPTS, DEBATE_PROMPT } from '@agentmesh/shared';
import { Transport } from '../axl/transport';
import { ZGComputeClient } from '../zg/compute';
import { randomUUID } from 'crypto';

export class AuditAgent {
  public node: AgentNode;
  private transport: Transport;
  private compute: ZGComputeClient;
  private onStatusChange?: (agent: AgentNode) => void;
  private onFinding?: (finding: Finding) => void;
  private onMessage?: (msg: AXLMessage) => void;

  constructor(
    specialty: AgentSpecialty,
    ensName: string,
    transport: Transport,
    compute: ZGComputeClient,
    axlPort: number,
  ) {
    this.node = {
      id: randomUUID(),
      peerId: transport.getPeerId(),
      ensName,
      specialty,
      capabilities: [specialty],
      status: 'idle',
      axlPort,
    };
    this.transport = transport;
    this.compute = compute;
  }

  onEvents(handlers: {
    onStatusChange?: (agent: AgentNode) => void;
    onFinding?: (finding: Finding) => void;
    onMessage?: (msg: AXLMessage) => void;
  }): void {
    this.onStatusChange = handlers.onStatusChange;
    this.onFinding = handlers.onFinding;
    this.onMessage = handlers.onMessage;
  }

  private setStatus(status: AgentStatus): void {
    this.node.status = status;
    this.onStatusChange?.(this.node);
  }

  // Dual evaluation: deterministic static scan first (always succeeds),
  // then LLM deep analysis as additional contextual layer (Chorus pattern).
  async analyzeContract(sourceCode: string): Promise<Finding[]> {
    this.setStatus('analyzing');

    // Phase 1: Static pattern scan -- guaranteed findings, no LLM dependency
    const staticFindings = this.staticScan(sourceCode);
    for (const f of staticFindings) this.onFinding?.(f);

    // Phase 2: LLM deep analysis -- contextual reasoning, may fail gracefully
    try {
      const systemPrompt = AGENT_SYSTEM_PROMPTS[this.node.specialty];
      const llmTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM analysis timeout')), 30_000),
      );
      const response = await Promise.race([
        this.compute.chat(systemPrompt, `Analyze this Solidity contract:\n\n${sourceCode}`),
        llmTimeout,
      ]);

      // Strip markdown code fences if present (LLMs sometimes wrap JSON in ```json ... ```)
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const parsed = JSON.parse(cleanResponse);
      const llmFindings: Finding[] = (parsed.findings || []).map((f: Record<string, unknown>) => ({
        id: randomUUID(),
        agentId: this.node.id,
        agentSpecialty: this.node.specialty,
        type: f.type as string,
        severity: f.severity as string,
        title: f.title as string,
        description: f.description as string,
        evidence: f.evidence as string,
        lineNumbers: f.lineNumbers as string,
        confidence: Number(f.confidence) || 0.5,
        timestamp: Date.now(),
      }));

      for (const f of llmFindings) this.onFinding?.(f);

      // Static findings first (deterministic) + LLM findings (contextual)
      return [...staticFindings, ...llmFindings];
    } catch (error) {
      console.error(`[Agent:${this.node.specialty}] LLM analysis failed, returning static findings:`, error);
      // Static findings are still valid even when LLM fails
      return staticFindings;
    }
  }

  // Deterministic pattern scanner -- runs before LLM, always produces baseline findings
  private staticScan(sourceCode: string): Finding[] {
    const STATIC_PATTERNS: Record<string, Array<{
      regex: RegExp; type: string; severity: string;
      title: string; description: string; evidence: string; confidence: number;
    }>> = {
      reentrancy: [
        {
          regex: /\.call\{value:/,
          type: 'reentrancy', severity: 'HIGH',
          title: 'Potential reentrancy: external call with value',
          description: 'Contract makes an external call that sends ETH. If no nonReentrant guard, callee can re-enter.',
          evidence: '.call{value:',
          confidence: 0.75,
        },
        {
          regex: /\.call\{value:.*\}[\s\S]{0,200}[a-zA-Z_]+\s*[+-]?=\s*(?!0)/m,
          type: 'reentrancy', severity: 'CRITICAL',
          title: 'State update after external call (CEI violation)',
          description: 'State variable is modified after an external .call{value:} -- classic reentrancy pattern.',
          evidence: 'state change after .call{value:}',
          confidence: 0.9,
        },
      ],
      'access-control': [
        {
          regex: /function\s+\w+\s*\([^)]*\)\s+public(?!\s+view|\s+pure)(?![^{]*onlyOwner)/,
          type: 'missing-access-control', severity: 'MEDIUM',
          title: 'Public state-changing function without onlyOwner',
          description: 'A public non-view function lacks an access control modifier.',
          evidence: 'public function without onlyOwner',
          confidence: 0.7,
        },
      ],
      logic: [
        {
          regex: /uint(?:256)?\s+\w+\s*=\s*\w+\s*\+\s*\w+(?!\s*;[\s\S]*SafeMath)/,
          type: 'integer-overflow', severity: 'MEDIUM',
          title: 'Unchecked arithmetic addition',
          description: 'Addition without SafeMath or unchecked block -- potential overflow in older Solidity.',
          evidence: 'uint addition without SafeMath',
          confidence: 0.6,
        },
      ],
      economic: [
        {
          regex: /slot0\(\)|getReserves\(\)|observe\(/,
          type: 'price-manipulation', severity: 'HIGH',
          title: 'Spot price oracle usage',
          description: 'Contract reads spot price (slot0/getReserves) which can be manipulated via flashloan in the same block.',
          evidence: 'slot0() or getReserves() oracle',
          confidence: 0.85,
        },
      ],
    };

    const patterns = STATIC_PATTERNS[this.node.specialty] || [];
    return patterns
      .filter((p) => p.regex.test(sourceCode))
      .map((p) => ({
        id: randomUUID(),
        agentId: this.node.id,
        agentSpecialty: this.node.specialty,
        type: p.type,
        severity: p.severity,
        title: p.title,
        description: p.description,
        evidence: p.evidence,
        lineNumbers: 'static-scan',
        confidence: p.confidence,
        timestamp: Date.now(),
      }));
  }

  async shareFindings(findings: Finding[], peerIds: string[]): Promise<void> {
    this.setStatus('debating');

    for (const peerId of peerIds) {
      if (peerId === this.transport.getPeerId()) continue;

      for (const finding of findings) {
        const message: AXLMessage = {
          type: 'finding',
          payload: finding,
          fromAgent: this.node.id,
          toAgent: peerId,
          timestamp: Date.now(),
        };

        try {
          await this.transport.send(peerId, message);
          this.onMessage?.(message);
        } catch (error) {
          console.error(`[Agent:${this.node.specialty}] Send to ${peerId.slice(0, 8)} failed:`, error);
        }
      }
    }
  }

  async evaluateFinding(finding: Finding): Promise<Vote> {
    this.setStatus('voting');

    try {
      const llmTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM vote timeout')), 15_000),
      );
      const response = await Promise.race([
        this.compute.chat(
          DEBATE_PROMPT,
          `Finding from ${finding.agentSpecialty} agent:\nType: ${finding.type}\nSeverity: ${finding.severity}\nTitle: ${finding.title}\nDescription: ${finding.description}\nEvidence: ${finding.evidence}`,
        ),
        llmTimeout,
      ]);

      const parsed = JSON.parse(response);
      return {
        agentId: this.node.id,
        findingId: finding.id,
        agree: Boolean(parsed.agree),
        severity: parsed.severity || finding.severity,
        confidence: Number(parsed.confidence) || 0.5,
        reasoning: String(parsed.reasoning || ''),
      };
    } catch {
      return {
        agentId: this.node.id,
        findingId: finding.id,
        agree: true, // Default to agreeing if inference fails
        severity: finding.severity,
        confidence: 0.3,
        reasoning: 'Inference failed, defaulting to agree with low confidence',
      };
    }
  }

  async pollMessages(): Promise<AXLMessage[]> {
    const messages: AXLMessage[] = [];
    let msg = await this.transport.recv();
    while (msg) {
      messages.push(msg.message);
      this.onMessage?.(msg.message);
      msg = await this.transport.recv();
    }
    return messages;
  }
}
