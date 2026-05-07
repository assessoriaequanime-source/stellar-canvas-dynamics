import fs from "fs";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";

const DEFAULT_CLUSTER = "devnet";

export function getSolanaCluster(): "devnet" {
  const configured = (process.env.SOLANA_CLUSTER || DEFAULT_CLUSTER).toLowerCase();
  if (configured !== "devnet") {
    throw new Error(`Only Solana devnet is supported for this layer. Received SOLANA_CLUSTER=${configured}`);
  }
  return "devnet";
}

export function getSolanaConnection(): Connection {
  const cluster = getSolanaCluster();
  const rpcUrl = (process.env.SOLANA_RPC_URL || clusterApiUrl(cluster)).trim();
  return new Connection(rpcUrl, "confirmed");
}

export function getExplorerTxUrl(signature: string): string {
  const cluster = getSolanaCluster();
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function loadDeployerKeypair(): Keypair {
  const keypairPath = process.env.SGL_DEPLOYER_KEYPAIR_PATH?.trim();

  if (!keypairPath || !fs.existsSync(keypairPath)) {
    throw new Error("SGL_DEPLOYER_KEYPAIR_PATH is not configured or keypair file is missing");
  }

  const raw = fs.readFileSync(keypairPath, "utf8");
  const secretArray = JSON.parse(raw) as number[];

  if (!Array.isArray(secretArray) || secretArray.length === 0) {
    throw new Error("Invalid deployer keypair format");
  }

  return Keypair.fromSecretKey(Uint8Array.from(secretArray));
}
