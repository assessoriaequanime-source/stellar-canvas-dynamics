import { TransactionStatus, TransactionType } from "@prisma/client";
import { z } from "zod";

export const createTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "txHash must be a valid 32-byte hash")
    .optional(),
});

export const updateTransactionStatusSchema = z.object({
  status: z.nativeEnum(TransactionStatus),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "txHash must be a valid 32-byte hash")
    .optional(),
});
