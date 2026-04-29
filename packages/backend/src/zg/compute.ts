// File: packages/backend/src/zg/compute.ts

import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { ZG_COMPUTE_RPC, ZG_COMPUTE_MODEL_TESTNET } from '@agentmesh/shared';

export class ZGComputeClient {
  private broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>> | null = null;
  private wallet: ethers.Wallet;
  private providerAddress: string = '';
  private ready: boolean = false;

  constructor(privateKey: string) {
    const provider = new ethers.JsonRpcProvider(ZG_COMPUTE_RPC);
    this.wallet = new ethers.Wallet(privateKey, provider);
  }

  async initialize(): Promise<void> {
    this.broker = await createZGComputeNetworkBroker(this.wallet);

    // List available services to find a provider
    const services = await this.broker.inference.listService();
    const chatService = services.find(
      (s) => String(s.model ?? '').includes('qwen') || String(s.model ?? '').includes('deepseek'),
    );

    if (chatService) {
      this.providerAddress = String(chatService.provider ?? '');
      console.log(`[0G Compute] Using provider: ${this.providerAddress}, model: ${chatService.model}`);
      this.ready = true;
    } else {
      console.warn('[0G Compute] No suitable chat service found. Using first available.');
      if (services.length > 0) {
        this.providerAddress = String(services[0].provider ?? '');
        this.ready = true;
      }
    }
  }

  isReady(): boolean {
    return this.ready && this.broker !== null;
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.broker || !this.ready) {
      throw new Error('0G Compute broker not initialized or not ready.');
    }

    // Wrap all broker operations in a timeout to prevent SDK retry loops from hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(this.providerAddress);
      const headers = await this.broker.inference.getRequestHeaders(this.providerAddress);

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          model,
          temperature: 0.3,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`0G Compute inference failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message?.content || '{}';
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
