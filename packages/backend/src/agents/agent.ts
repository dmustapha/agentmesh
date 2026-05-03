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
    this.onMessage?.({
      type: 'analysis',
      payload: { phase: 'static-scan', specialty: this.node.specialty },
      fromAgent: this.node.id,
      toAgent: 'broadcast',
      timestamp: Date.now(),
    });
    const staticFindings = this.staticScan(sourceCode);
    for (const f of staticFindings) this.onFinding?.(f);
    if (staticFindings.length > 0) {
      this.onMessage?.({
        type: 'result',
        payload: { phase: 'static-scan', specialty: this.node.specialty, count: staticFindings.length },
        fromAgent: this.node.id,
        toAgent: 'broadcast',
        timestamp: Date.now(),
      });
    }

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

      // Clean LLM response: strip markdown fences, trailing commas, fix truncated JSON
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      // Remove trailing commas before } or ] (common LLM error)
      cleanResponse = cleanResponse.replace(/,\s*([\]}])/g, '$1');
      // Attempt to close truncated JSON
      if (!cleanResponse.endsWith('}') && !cleanResponse.endsWith(']')) {
        const openBraces = (cleanResponse.match(/{/g) || []).length;
        const closeBraces = (cleanResponse.match(/}/g) || []).length;
        cleanResponse += '}'.repeat(Math.max(0, openBraces - closeBraces));
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
      this.onMessage?.({
        type: 'fallback',
        payload: { phase: 'llm-analysis', specialty: this.node.specialty, reason: 'LLM unavailable, using static analysis' },
        fromAgent: this.node.id,
        toAgent: 'broadcast',
        timestamp: Date.now(),
      });
      // Static findings are still valid even when LLM fails
      return staticFindings;
    }
  }

  // Deterministic pattern scanner -- runs before LLM, always produces baseline findings
  private staticScan(sourceCode: string): Finding[] {
    interface StaticPattern {
      regex: RegExp; type: string; severity: string;
      title: string; description: string; evidence: string; confidence: number;
      suppressIf?: RegExp; // False-positive suppression: skip match if this pattern is also present
    }

    const STATIC_PATTERNS: Record<string, StaticPattern[]> = {
      reentrancy: [
        {
          regex: /\.call\{value:/,
          type: 'reentrancy', severity: 'HIGH',
          title: 'Potential reentrancy: external call with value',
          description: 'Contract makes an external call that sends ETH. If no reentrancy guard, callee can re-enter.',
          evidence: '.call{value:',
          confidence: 0.75,
          suppressIf: /nonReentrant|ReentrancyGuard/,
        },
        {
          regex: /\.call\{value:.*\}[\s\S]{0,200}[a-zA-Z_]+\s*[+-]?=\s*(?!0)/m,
          type: 'reentrancy', severity: 'CRITICAL',
          title: 'State update after external call (CEI violation)',
          description: 'State variable is modified after an external .call{value:} -- classic reentrancy pattern.',
          evidence: 'state change after .call{value:}',
          confidence: 0.9,
          suppressIf: /nonReentrant|ReentrancyGuard/,
        },
        {
          regex: /\.transfer\(|\.send\(/,
          type: 'reentrancy', severity: 'LOW',
          title: 'Transfer/send usage (limited gas forwarding)',
          description: 'Using .transfer() or .send() limits gas to 2300, but may fail with contract recipients after EIP-1884.',
          evidence: '.transfer() or .send()',
          confidence: 0.5,
        },
      ],
      'access-control': [
        {
          regex: /function\s+\w+\s*\([^)]*\)\s+public(?!\s+view|\s+pure)(?![^{]*onlyOwner|[^{]*onlyRole|[^{]*require\s*\(\s*msg\.sender)/,
          type: 'missing-access-control', severity: 'MEDIUM',
          title: 'Public state-changing function without access control',
          description: 'A public non-view function lacks an access control modifier (onlyOwner, onlyRole, or msg.sender check).',
          evidence: 'public function without access control',
          confidence: 0.7,
        },
        {
          regex: /tx\.origin/,
          type: 'access-control', severity: 'HIGH',
          title: 'tx.origin used for authentication',
          description: 'Using tx.origin for authorization is vulnerable to phishing attacks via intermediary contracts.',
          evidence: 'tx.origin',
          confidence: 0.9,
        },
        {
          regex: /selfdestruct\s*\(|suicide\s*\(/,
          type: 'access-control', severity: 'CRITICAL',
          title: 'selfdestruct present in contract',
          description: 'Contract contains selfdestruct which can permanently destroy the contract and send remaining ETH to an address.',
          evidence: 'selfdestruct()',
          confidence: 0.85,
          suppressIf: /onlyOwner[\s\S]{0,100}selfdestruct/,
        },
        {
          regex: /delegatecall\s*\(/,
          type: 'access-control', severity: 'HIGH',
          title: 'delegatecall usage detected',
          description: 'delegatecall executes code in the context of the calling contract. Malicious targets can corrupt storage.',
          evidence: 'delegatecall()',
          confidence: 0.8,
        },
      ],
      logic: [
        {
          regex: /uint(?:256)?\s+\w+\s*=\s*\w+\s*\+\s*\w+/,
          type: 'integer-overflow', severity: 'MEDIUM',
          title: 'Unchecked arithmetic addition',
          description: 'Addition without SafeMath or unchecked block -- potential overflow in Solidity < 0.8.',
          evidence: 'uint addition without SafeMath',
          confidence: 0.6,
          suppressIf: /pragma solidity\s+\^?0\.[89]/,
        },
        {
          regex: /unchecked\s*\{/,
          type: 'logic-error', severity: 'MEDIUM',
          title: 'Unchecked arithmetic block',
          description: 'Unchecked block disables overflow/underflow protection. Verify the math cannot overflow.',
          evidence: 'unchecked { }',
          confidence: 0.65,
        },
        {
          regex: /assembly\s*\{/,
          type: 'logic-error', severity: 'MEDIUM',
          title: 'Inline assembly usage',
          description: 'Inline assembly bypasses Solidity safety checks. Manual review required for correctness.',
          evidence: 'assembly { }',
          confidence: 0.6,
        },
        {
          regex: /ecrecover\s*\(/,
          type: 'logic-error', severity: 'HIGH',
          title: 'ecrecover without zero-address check',
          description: 'ecrecover returns address(0) for invalid signatures. Without checking, anyone can forge authorization.',
          evidence: 'ecrecover()',
          confidence: 0.75,
          suppressIf: /require\s*\([^)]*!=\s*address\(0\)/,
        },
        {
          regex: /block\.(timestamp|number)\s*[<>=]/,
          type: 'logic-error', severity: 'LOW',
          title: 'Block timestamp/number used for comparison',
          description: 'Block timestamp can be manipulated slightly by miners. Avoid using for critical time-sensitive logic.',
          evidence: 'block.timestamp or block.number comparison',
          confidence: 0.5,
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
          suppressIf: /TWAP|twap|timeWeightedAverage/,
        },
        {
          regex: /flashLoan|flashloan|flash_loan/i,
          type: 'flash-loan', severity: 'MEDIUM',
          title: 'Flash loan interface detected',
          description: 'Contract implements or interacts with flash loans. Ensure all state changes are atomic and validated.',
          evidence: 'flashLoan reference',
          confidence: 0.7,
        },
        {
          regex: /balanceOf\s*\(\s*address\s*\(\s*this\s*\)\s*\)/,
          type: 'price-manipulation', severity: 'HIGH',
          title: 'Contract balance used as accounting variable',
          description: 'Using balanceOf(address(this)) for accounting can be manipulated via direct ETH/token sends.',
          evidence: 'balanceOf(address(this))',
          confidence: 0.8,
        },
        {
          regex: /\.approve\s*\([^)]*,\s*type\(uint256\)\.max/,
          type: 'other', severity: 'MEDIUM',
          title: 'Max approval (infinite allowance)',
          description: 'Setting max uint256 approval gives the spender unlimited access to tokens. Consider bounded approvals.',
          evidence: 'approve(, type(uint256).max)',
          confidence: 0.6,
        },
      ],
    };

    const patterns = STATIC_PATTERNS[this.node.specialty] || [];
    return patterns
      .filter((p) => {
        if (!p.regex.test(sourceCode)) return false;
        // False-positive suppression: skip if suppressIf pattern also matches
        if (p.suppressIf && p.suppressIf.test(sourceCode)) return false;
        return true;
      })
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
      this.onMessage?.({
        type: 'vote-abstain',
        payload: { findingId: finding.id, specialty: this.node.specialty, reason: 'LLM unavailable' },
        fromAgent: this.node.id,
        toAgent: finding.agentId,
        timestamp: Date.now(),
      });
      return {
        agentId: this.node.id,
        findingId: finding.id,
        agree: false, // Abstain on inference failure — never inflate consensus
        severity: finding.severity,
        confidence: 0,
        reasoning: 'Inference failed — abstaining to avoid false consensus inflation',
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
