export type AvatarProviderKind = "default" | "native" | "elevenlabs" | "custom";

export type SentimentProfile = "neutral" | "empathetic" | "warm" | "professional";

export type LlmRequest = {
  tenantId: string;
  userId: string;
  modelId: string;
  message: string;
  sentiment: SentimentProfile;
  metadata?: Record<string, unknown>;
};

export type LlmResponse = {
  text: string;
  provider: AvatarProviderKind;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

export type VoiceRequest = {
  tenantId: string;
  userId: string;
  text: string;
  voiceId?: string;
  sentiment: SentimentProfile;
  metadata?: Record<string, unknown>;
};

export type VoiceResponse = {
  provider: AvatarProviderKind;
  audioUrl?: string;
  audioBase64?: string;
  contentType?: string;
};

export type AvatarInteractionResult = {
  text: string;
  audio?: VoiceResponse;
};
