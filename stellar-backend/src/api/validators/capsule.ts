import { z } from "zod";

export const createCapsuleSchema = z.object({
  name: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  unlockDate: z.string().datetime(),
  metadata: z.unknown().optional(),
});

export const updateCapsuleSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    content: z.string().min(1).max(5000).optional(),
    unlockDate: z.string().datetime().optional(),
    metadata: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.content !== undefined ||
      value.unlockDate !== undefined ||
      value.metadata !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

const recipientEmailSchema = z.string().email().max(255).optional();
const recipientWhatsappSchema = z.string().min(8).max(32).optional();

export const createJudgeAccessCapsuleSchema = z
  .object({
    name: z.string().min(1).max(120),
    content: z.string().min(1).max(5000),
    deliveryType: z.enum(["immediate", "scheduled"]),
    channel: z.enum(["email", "whatsapp", "both"]),
    unlockDate: z.string().datetime().optional(),
    recipientName: z.string().min(2).max(120),
    recipientEmail: recipientEmailSchema,
    recipientWhatsapp: recipientWhatsappSchema,
  })
  .superRefine((value, ctx) => {
    if ((value.channel === "email" || value.channel === "both") && !value.recipientEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientEmail"],
        message: "recipientEmail is required for email delivery",
      });
    }

    if ((value.channel === "whatsapp" || value.channel === "both") && !value.recipientWhatsapp) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientWhatsapp"],
        message: "recipientWhatsapp is required for WhatsApp delivery",
      });
    }

    if (value.deliveryType === "scheduled" && !value.unlockDate) {
      ctx.addIssue({
        code: "custom",
        path: ["unlockDate"],
        message: "unlockDate is required for scheduled delivery",
      });
    }
  });

export const consumeJudgeAccessCapsuleSchema = z.object({
  inviteToken: z.string().min(16).max(256),
  accessCode: z.string().min(4).max(32),
});
