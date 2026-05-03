// File: packages/shared/src/constants.ts

// AXL Configuration
export const AXL_PORTS = [9002, 9003, 9004, 9005] as const;
export const AXL_HOST = '127.0.0.1';

// Agent Configuration
export const AGENT_SPECIALTIES = [
  'reentrancy',
  'access-control',
  'logic',
  'economic',
] as const;

export const AGENT_ENS_NAMES = [
  'reentrancy.agentmesh.eth',
  'access.agentmesh.eth',
  'logic.agentmesh.eth',
  'economic.agentmesh.eth',
] as const;

export const ENS_PARENT_NAME = 'agentmesh.eth';

// 0G Chain Testnet
export const ZG_CHAIN_RPC = 'https://evmrpc-testnet.0g.ai';
export const ZG_CHAIN_ID = 16602;
export const ZG_EXPLORER = 'https://chainscan-galileo.0g.ai';
export const ZG_FAUCET = 'https://faucet.0g.ai';

// 0G Compute
export const ZG_COMPUTE_RPC = 'https://evmrpc-testnet.0g.ai';
export const ZG_COMPUTE_CHAIN_ID = 16602;
export const ZG_COMPUTE_MODEL_TESTNET = 'qwen-2.5-7b-instruct';
export const ZG_COMPUTE_MODEL_MAINNET = 'deepseek-chat-v3-0324';

// 0G Storage
export const ZG_STORAGE_INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';
export const ZG_STORAGE_RPC = 'https://evmrpc-testnet.0g.ai';

// ENS Sepolia — defaults only, overridden by backend env vars at runtime
export const ENS_SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/demo';
export const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
export const ENS_PUBLIC_RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5';
export const ENS_NAME_WRAPPER = '0x0635513f179D50A207757E05759CbD106d7dFcE8';

// Contract addresses — deployed to 0G Chain Testnet (chain ID 16602)
export const AGENT_REGISTRY_ADDRESS = '0xd07B4222D25feB1Db2d87E512Ed0Cbf88c105F3A';
export const AUDIT_ATTESTATION_ADDRESS = '0x544097E0446a42eD6A298cDe34227Da559f25011';

// Backend
export const BACKEND_PORT = 3001;
export const FRONTEND_PORT = 3000;

// Consensus
export const CONSENSUS_AGREEMENT_THRESHOLD = 0.5; // 2/4 agents must agree
export const CONSENSUS_CRITICAL_CONFIDENCE = 0.9; // Single agent can flag CRITICAL if confidence >= 0.9
export const MAX_AUDIT_DURATION_MS = 120_000; // 2 minutes max

// Etherscan
export const ETHERSCAN_API = 'https://api.etherscan.io/v2/api?chainid=1';
