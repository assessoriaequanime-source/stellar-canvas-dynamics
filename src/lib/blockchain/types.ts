/**
 * Blockchain Types
 * Shared interfaces for wallet and blockchain operations
 */

export interface WalletData {
  address: string;
  privateKey?: string;
  mnemonic?: string;
  path?: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  amount?: string;
  type?: string;
  error?: string;
}

export interface GasETHTransfer extends TransactionResult {
  type: 'gas_eth';
}

export interface SGLTransfer extends TransactionResult {
  type: 'sgl_transfer';
}

export interface ContractConfig {
  name: string;
  address: string;
  abi: string[];
}

export interface Avatar {
  id: number;
  name: string;
  metadataHash: string;
  owner: string;
  createdAt: number;
}

export interface TimeCapsule {
  id: number;
  avatarId: number;
  contentHash: string;
  unlockTime: number;
  recipient: string;
  isOpened: boolean;
}

export interface DigitalLegacy {
  id: number;
  avatarId: number;
  legacyHash: string;
  heirs: string[];
  createdAt: number;
}

export interface BlockchainProvider {
  isConnected: boolean;
  url: string;
}

export interface WriteOperation {
  success: boolean;
  hash?: string;
  error?: string;
  message?: string;
}
