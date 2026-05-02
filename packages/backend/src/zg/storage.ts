// File: packages/backend/src/zg/storage.ts

import { ethers } from 'ethers';
import { Indexer, ZgFile } from '@0gfoundation/0g-ts-sdk';
import { ZG_STORAGE_INDEXER, ZG_STORAGE_RPC } from '@agentmesh/shared';
import type { AuditReport } from '@agentmesh/shared';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class ZGStorageClient {
  private signer: ethers.Wallet;
  private indexer: Indexer;

  constructor(privateKey: string) {
    const provider = new ethers.JsonRpcProvider(ZG_STORAGE_RPC);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.indexer = new Indexer(ZG_STORAGE_INDEXER);
  }

  async uploadReport(report: AuditReport): Promise<{ rootHash: string; txHash: string }> {
    const reportJson = JSON.stringify(report, null, 2);
    const sizeBytes = Buffer.byteLength(reportJson, 'utf8');
    const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
    if (sizeBytes > MAX_UPLOAD_SIZE) {
      throw new Error(`Report too large for upload: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_UPLOAD_SIZE / 1024 / 1024}MB limit`);
    }

    // Write report to temp file
    const tempDir = join(tmpdir(), 'agentmesh');
    mkdirSync(tempDir, { recursive: true });
    const tempFile = join(tempDir, `report-${report.id}.json`);
    writeFileSync(tempFile, reportJson);

    try {
      const file = await ZgFile.fromFilePath(tempFile);
      const [txResponse, error] = await this.indexer.upload(
        file,
        ZG_STORAGE_RPC,
        this.signer,
      );

      if (error) {
        throw new Error(`0G Storage upload failed: ${error.message}`);
      }

      // Handle both single and batch upload response shapes
      const resp = txResponse as Record<string, unknown>;
      const rootHash = String(resp.rootHash ?? resp.root ?? '');
      const txHash = String(resp.txHash ?? resp.transactionHash ?? '');

      console.log(`[0G Storage] Uploaded report ${report.id}: rootHash=${rootHash}`);

      return { rootHash, txHash };
    } finally {
      try { unlinkSync(tempFile); } catch { /* ignore cleanup errors */ }
    }
  }

  async downloadReport(rootHash: string): Promise<AuditReport> {
    const [blob, error] = await this.indexer.downloadToBlob(rootHash, { proof: true });

    if (error) {
      throw new Error(`0G Storage download failed: ${error.message}`);
    }

    const text = await blob.text();
    return JSON.parse(text) as AuditReport;
  }
}
