import { z } from "zod";

const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const createAvatarSchema = z.object({
  name: z.string().min(1).max(100),
  contractAddress: z
    .string()
    .regex(walletAddressRegex, "contractAddress must be a valid EVM address")
    .optional(),
  traits: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export const updateAvatarSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    contractAddress: z
      .string()
      .regex(walletAddressRegex, "contractAddress must be a valid EVM address")
      .optional(),
    traits: z.unknown().optional(),
    metadata: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.contractAddress !== undefined ||
      value.traits !== undefined ||
      value.metadata !== undefined,
    {
      message: "At least one field must be provided",
    },
  );
