import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import type {
  SolanaAdapter,
  SolanaTransactionRequest,
  SolanaTransactionResult,
} from "./solanaAdapter";

const DEVNET_RPC = "https://api.devnet.solana.com";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SESSION_KEY = "singulai_devnet_keypair";

/** Retorna keypair persistida na sessão ou cria uma nova. */
function getSessionKeypair(): Keypair {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const bytes = Uint8Array.from(JSON.parse(stored) as number[]);
      return Keypair.fromSecretKey(bytes);
    }
  } catch {
    // fallthrough: gera nova keypair
  }
  const kp = Keypair.generate();
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(kp.secretKey)));
  } catch {
    // sessionStorage indisponível em SSR — ok
  }
  return kp;
}

/** Solicita airdrop de 1 SOL na Devnet se o saldo for insuficiente. */
async function ensureFunds(connection: Connection, keypair: Keypair): Promise<void> {
  const balance = await connection.getBalance(keypair.publicKey);
  if (balance < 5_000_000) {
    // < 0.005 SOL — solicita 1 SOL
    const sig = await connection.requestAirdrop(keypair.publicKey, 1_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
  }
}

export class RealSolanaAdapter implements SolanaAdapter {
  private connection = new Connection(DEVNET_RPC, "confirmed");

  async submitTransaction(input: SolanaTransactionRequest): Promise<SolanaTransactionResult> {
    const keypair = getSessionKeypair();

    await ensureFunds(this.connection, keypair);

    const memoText = JSON.stringify({
      app: "SingulAI-AvatarPro",
      service: input.serviceType,
      wallet: input.walletAddress.slice(0, 12),
      hash: input.payloadHash.slice(0, 16),
      ts: Date.now(),
    });

    const instruction = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, "utf-8"),
    });

    const tx = new Transaction().add(instruction);

    const txSignature = await sendAndConfirmTransaction(this.connection, tx, [keypair], {
      commitment: "confirmed",
    });

    return {
      txSignature,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
      network: "devnet",
    };
  }
}
