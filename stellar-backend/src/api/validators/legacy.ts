import { z } from "zod";

const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const createLegacySchema = z.object({
  name: z.string().min(1).max(120),
  beneficiaries: z.unknown(),
  assets: z.unknown().optional(),
  contractAddress: z
    .string()
    .regex(walletAddressRegex, "contractAddress must be a valid EVM address")
    .optional(),
});

export const updateLegacySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    beneficiaries: z.unknown().optional(),
    assets: z.unknown().optional(),
    contractAddress: z
      .string()
      .regex(walletAddressRegex, "contractAddress must be a valid EVM address")
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.beneficiaries !== undefined ||
      value.assets !== undefined ||
      value.contractAddress !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
