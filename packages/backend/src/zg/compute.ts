// File: packages/backend/src/zg/compute.ts

import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { ZG_COMPUTE_RPC, ZG_COMPUTE_MODEL_TESTNET } from '@agentmesh/shared';

export class ZGComputeClient {
  private broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>> | null = null;
  private wallet: ethers.Wallet;
  private providerAddress: string = '';
  private ready: boolean = false;
  private initAttempts: number = 0;
  private isDummy: boolean = false;

  constructor(privateKey: string) {
    const provider = new ethers.JsonRpcProvider(ZG_COMPUTE_RPC);
    this.wallet = new ethers.Wallet(privateKey, provider);
    // Detect dummy key (used when PRIVATE_KEY is not set)
    this.isDummy = privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001';
  }

  async initialize(): Promise<void> {
    if (this.isDummy) {
      console.warn('[0G Compute] Dummy key — skipping initialization');
      return;
    }

    this.initAttempts++;
    console.log(`[0G Compute] Initializing (attempt ${this.initAttempts})...`);

    this.broker = await createZGComputeNetworkBroker(this.wallet);

    // List available services to find a provider
    const services = await this.broker.inference.listService();
    console.log(`[0G Compute] Found ${services.length} services`);
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

  // Lazy init: if not ready on first chat call, try to initialize once
  private async ensureReady(): Promise<void> {
    if (this.ready && this.broker) return;
    if (this.isDummy) throw new Error('0G Compute running with dummy key (no PRIVATE_KEY set)');
    if (this.initAttempts >= 3) throw new Error('0G Compute init failed after 3 attempts');

    console.log('[0G Compute] Not ready, attempting lazy initialization...');
    await this.initialize();

    if (!this.ready || !this.broker) {
      throw new Error('0G Compute broker not initialized after retry');
    }
  }

  async chat(systemPrompt: string, userMessage: string, retries = 2): Promise<string> {
    await this.ensureReady();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);

      try {
        const { endpoint, model } = await this.broker!.inference.getServiceMetadata(this.providerAddress);
        const headers = await this.broker!.inference.getRequestHeaders(this.providerAddress);

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
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          const delay = 1000 * (attempt + 1);
          console.warn(`[0G Compute] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise((r) => setTimeout(r, delay));
        }
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError ?? new Error('0G Compute inference failed after retries');
  }
}
