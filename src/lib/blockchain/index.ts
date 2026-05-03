/**
 * Blockchain Module Exports
 * Central entry point for all blockchain utilities
 */

// Types
export type {
  WalletData,
  TransactionResult,
  GasETHTransfer,
  SGLTransfer,
  ContractConfig,
  Avatar,
  TimeCapsule,
  DigitalLegacy,
  BlockchainProvider,
  WriteOperation,
} from './types';

// Contracts
export {
  SEPOLIA_RPC_URLS,
  SGL_TOKEN_ADDRESS,
  INITIAL_SGL_BALANCE,
  GAS_ETH_AMOUNT,
  ERC20_ABI,
  CONTRACTS,
  getContractConfig,
} from './contracts';

// Wallet utilities
export {
  generateRandomWallet,
  isValidAddress,
  isValidPrivateKey,
  getChecksumAddress,
  encryptData,
  decryptData,
  formatAddressShort,
  getAddressFromPrivateKey,
} from './wallet';

// Blockchain service
export { blockchainService, BlockchainReadService } from './blockchain';
