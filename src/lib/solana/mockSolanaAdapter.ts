import type { SolanaAdapter, SolanaTransactionRequest, SolanaTransactionResult } from "./solanaAdapter";

function randomId(size: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  let out = "";

  for (let i = 0; i < size; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

export class MockSolanaAdapter implements SolanaAdapter {
  async submitTransaction(_input: SolanaTransactionRequest): Promise<SolanaTransactionResult> {
    const txSignature = `MOCK-${randomId(28)}`;

    return {
      txSignature,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
      network: "mock",
    };
  }
}
