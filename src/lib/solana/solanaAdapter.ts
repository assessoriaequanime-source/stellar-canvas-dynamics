export type SolanaNetwork = "mock" | "devnet";

export interface SolanaTransactionRequest {
  walletAddress: string;
  serviceType: string;
  payloadHash: string;
}

export interface SolanaTransactionResult {
  txSignature: string;
  explorerUrl: string;
  network: SolanaNetwork;
}

export interface SolanaAdapter {
  submitTransaction(input: SolanaTransactionRequest): Promise<SolanaTransactionResult>;
}
