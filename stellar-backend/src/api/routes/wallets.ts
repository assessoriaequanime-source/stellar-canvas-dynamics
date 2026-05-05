import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { appendAuditEvent } from "../../storage/auditStore";
import {
  getOrCreateUserAssociatedTokenAccount,
  getSglBalance,
  getSglMint,
  hasReceivedInitialCredit,
  mintInitialDemoCredit,
} from "../../services/sglSolanaService";
import { registerProofMemo } from "../../services/solanaProofService";
import { AppError } from "../middlewares/errorHandler";

const router = Router();

function sha256Fallback(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

router.post("/provision", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string; email?: string };

    if (!walletAddress) {
      throw new AppError(400, "walletAddress is required", "INVALID_PAYLOAD");
    }

    const normalizedWallet = new PublicKey(walletAddress).toBase58();
    const ata = await getOrCreateUserAssociatedTokenAccount(normalizedWallet);
    const alreadyReceived = hasReceivedInitialCredit(normalizedWallet);

    let initialCreditTxSignature: string | null = null;
    let initialCreditAmount = 0;

    if (!alreadyReceived) {
      const mintResult = await mintInitialDemoCredit(normalizedWallet);
      initialCreditTxSignature = mintResult.txSignature;
      initialCreditAmount = mintResult.amount;
    }

    const payloadHash = sha256Fallback(`${normalizedWallet}:${Date.now()}:wallet_provision`);

    const proof = await registerProofMemo({
      eventType: "wallet_provision",
      avatarId: "avatarpro",
      walletAddress: normalizedWallet,
      payloadHash,
      timestamp: new Date().toISOString(),
    });

    const balance = await getSglBalance(normalizedWallet);

    appendAuditEvent({
      walletAddress: normalizedWallet,
      avatarId: "avatarpro",
      eventType: "wallet_provision",
      serviceType: "wallet_provision",
      payloadHash,
      txSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
      createdAt: new Date().toISOString(),
      network: "solana-devnet",
      mintAddress: getSglMint().toBase58(),
    });

    res.status(200).json({
      walletAddress: normalizedWallet,
      sglMintAddress: getSglMint().toBase58(),
      tokenAccount: ata.tokenAccount.toBase58(),
      sglBalance: balance.balance,
      initialCreditAmount,
      initialCreditTxSignature,
      proofTxSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
