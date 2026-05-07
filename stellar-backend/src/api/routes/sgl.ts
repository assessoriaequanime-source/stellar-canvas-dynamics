import { createHash } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { appendAuditEvent } from "../../storage/auditStore";
import { registerProofMemo } from "../../services/solanaProofService";
import { debitSglForService, getSglBalance, getSglMint } from "../../services/sglSolanaService";
import { AppError } from "../middlewares/errorHandler";

const router = Router();

router.get("/balance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const walletAddress = req.query.walletAddress?.toString();
    if (!walletAddress) {
      throw new AppError(400, "walletAddress is required", "INVALID_PAYLOAD");
    }

    const normalizedWallet = new PublicKey(walletAddress).toBase58();
    const balance = await getSglBalance(normalizedWallet);

    res.status(200).json({
      walletAddress: normalizedWallet,
      network: "solana-devnet",
      sglBalance: balance.balance,
      tokenAccount: balance.tokenAccount,
      decimals: balance.decimals,
      sglMintAddress: getSglMint().toBase58(),
      source: "solana-devnet",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/debit", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      walletAddress?: string;
      serviceType?: string;
      cost?: number;
      avatarId?: string;
      payloadHash?: string;
    };

    if (!body.walletAddress || !body.serviceType || !body.cost || body.cost <= 0) {
      throw new AppError(400, "walletAddress, serviceType and positive cost are required", "INVALID_PAYLOAD");
    }

    const normalizedWallet = new PublicKey(body.walletAddress).toBase58();
    const payloadHash = body.payloadHash || createHash("sha256")
      .update(`${normalizedWallet}:${body.serviceType}:${body.cost}:${Date.now()}`)
      .digest("hex");

    const debitPlan = await debitSglForService(normalizedWallet, body.serviceType, body.cost);

    const proof = await registerProofMemo({
      eventType: "service_usage",
      avatarId: body.avatarId,
      walletAddress: normalizedWallet,
      serviceType: body.serviceType,
      payloadHash,
      timestamp: new Date().toISOString(),
    });

    appendAuditEvent({
      walletAddress: normalizedWallet,
      avatarId: body.avatarId,
      eventType: "service_usage",
      serviceType: body.serviceType,
      cost: body.cost,
      payloadHash,
      txSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
      createdAt: new Date().toISOString(),
      network: "solana-devnet",
      mintAddress: getSglMint().toBase58(),
      debitStatus: debitPlan.debitStatus,
    });

    const balance = await getSglBalance(normalizedWallet);

    res.status(200).json({
      debitStatus: debitPlan.debitStatus,
      proofTxSignature: proof.txSignature,
      txSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
      payloadHash,
      sglBalance: balance.balance,
      unsignedTxBase64: debitPlan.unsignedTxBase64,
      sourceTokenAccount: debitPlan.sourceTokenAccount,
      treasuryTokenAccount: debitPlan.treasuryTokenAccount,
      message: "Proof registered on Solana Devnet. SGL debit requires wallet signature.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/ledger", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const walletAddress = req.query.walletAddress?.toString();
    if (!walletAddress) {
      throw new AppError(400, "walletAddress is required", "INVALID_PAYLOAD");
    }

    const balance = await getSglBalance(new PublicKey(walletAddress).toBase58());
    const items = [{
      type: "balance_snapshot",
      network: "solana-devnet",
      sglBalance: balance.balance,
      tokenAccount: balance.tokenAccount,
      mintAddress: getSglMint().toBase58(),
      createdAt: new Date().toISOString(),
    }];
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
});

export default router;
