import {
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { hasInitialCredit, markInitialCredit } from "../storage/auditStore";
import { getSolanaConnection, loadDeployerKeypair } from "./solanaConnection";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for real Solana Devnet mode`);
  }
  return value;
}

function toTokenBaseUnits(amount: number, decimals: number): bigint {
  const baseUnits = Math.floor(amount * 10 ** decimals);
  return BigInt(baseUnits);
}

export function getSglMint(): PublicKey {
  return new PublicKey(getRequiredEnv("SGL_MINT_ADDRESS"));
}

function getTreasuryWallet(): PublicKey {
  return new PublicKey((process.env.SGL_TREASURY_WALLET || process.env.SGL_AUTHORITY_WALLET || "").trim() || loadDeployerKeypair().publicKey.toBase58());
}

export async function getUserAssociatedTokenAccount(walletAddress: string): Promise<PublicKey> {
  const owner = new PublicKey(walletAddress);
  const mint = getSglMint();
  return getAssociatedTokenAddress(mint, owner);
}

export async function getOrCreateUserAssociatedTokenAccount(walletAddress: string): Promise<{ tokenAccount: PublicKey }> {
  const connection = getSolanaConnection();
  const deployer = loadDeployerKeypair();
  const owner = new PublicKey(walletAddress);
  const mint = getSglMint();

  const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, deployer, mint, owner);
  return { tokenAccount: tokenAccount.address };
}

export async function getSglBalance(walletAddress: string): Promise<{ balance: number; tokenAccount: string; decimals: number }> {
  const connection = getSolanaConnection();
  const tokenAccount = await getUserAssociatedTokenAccount(walletAddress);
  const mint = getSglMint();

  const mintInfo = await getMint(connection, mint);
  const tokenAccountInfo = await getAccount(connection, tokenAccount);
  const decimals = mintInfo.decimals;
  const balance = Number(tokenAccountInfo.amount) / 10 ** decimals;

  return {
    balance,
    tokenAccount: tokenAccount.toBase58(),
    decimals,
  };
}

export function hasReceivedInitialCredit(walletAddress: string): boolean {
  return hasInitialCredit(walletAddress, getSglMint().toBase58());
}

export async function mintInitialDemoCredit(walletAddress: string): Promise<{
  amount: number;
  txSignature: string;
  mintAddress: string;
  tokenAccount: string;
}> {
  const amount = Number(process.env.SGL_INITIAL_CREDIT || "10000");

  const connection = getSolanaConnection();
  const deployer = loadDeployerKeypair();
  const owner = new PublicKey(walletAddress);
  const mint = getSglMint();
  const mintInfo = await getMint(connection, mint);

  const ata = await getOrCreateAssociatedTokenAccount(connection, deployer, mint, owner);
  const signature = await mintTo(
    connection,
    deployer,
    mint,
    ata.address,
    deployer,
    toTokenBaseUnits(amount, mintInfo.decimals),
  );

  markInitialCredit(walletAddress, mint.toBase58(), signature);

  return {
    amount,
    txSignature: signature,
    mintAddress: mint.toBase58(),
    tokenAccount: ata.address.toBase58(),
  };
}

export async function debitSglForService(walletAddress: string, serviceType: string, cost: number): Promise<{
  debitStatus: "pending_wallet_signature";
  serviceType: string;
  cost: number;
  unsignedTxBase64: string;
  sourceTokenAccount: string;
  treasuryTokenAccount: string;
}> {
  const connection = getSolanaConnection();
  const deployer = loadDeployerKeypair();
  const owner = new PublicKey(walletAddress);
  const treasury = getTreasuryWallet();
  const mint = getSglMint();
  const mintInfo = await getMint(connection, mint);

  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, deployer, mint, owner);
  const treasuryAta = await getOrCreateAssociatedTokenAccount(connection, deployer, mint, treasury);

  const ix = createTransferCheckedInstruction(
    ownerAta.address,
    mint,
    treasuryAta.address,
    owner,
    toTokenBaseUnits(cost, mintInfo.decimals),
    mintInfo.decimals,
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  const unsignedTxBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

  return {
    debitStatus: "pending_wallet_signature",
    serviceType,
    cost,
    unsignedTxBase64,
    sourceTokenAccount: ownerAta.address.toBase58(),
    treasuryTokenAccount: treasuryAta.address.toBase58(),
  };
}
