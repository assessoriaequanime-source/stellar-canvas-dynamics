import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getExplorerTxUrl, getSolanaConnection, loadDeployerKeypair } from "./solanaConnection";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface SolanaProofPayload {
  eventType: string;
  avatarId?: string;
  walletAddress: string;
  serviceType?: string;
  payloadHash: string;
  timestamp: string;
}

export async function registerProofMemo(payload: SolanaProofPayload): Promise<{
  txSignature: string;
  explorerUrl: string;
  payloadHash: string;
  network: "solana-devnet";
}> {
  const connection = getSolanaConnection();
  const deployer = loadDeployerKeypair();

  const memoValue = `SingulAI:${payload.eventType}:${payload.payloadHash}`.slice(0, 220);
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoValue, "utf8"),
  });

  const pingInstruction = SystemProgram.transfer({
    fromPubkey: deployer.publicKey,
    toPubkey: deployer.publicKey,
    lamports: 0,
  });

  const tx = new Transaction().add(memoInstruction, pingInstruction);
  tx.feePayer = deployer.publicKey;

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  const signature = await connection.sendTransaction(tx, [deployer]);
  await connection.confirmTransaction(signature, "confirmed");

  return {
    txSignature: signature,
    explorerUrl: getExplorerTxUrl(signature),
    payloadHash: payload.payloadHash,
    network: "solana-devnet",
  };
}
