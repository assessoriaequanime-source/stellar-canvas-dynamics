import axios from "axios";
import type { VoiceProvider } from "../voice-provider";
import type { VoiceRequest, VoiceResponse } from "../../../contracts/interaction-types";

export type CustomVoiceProviderConfig = {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export class CustomVoiceProvider implements VoiceProvider {
  public readonly name = "custom";

  constructor(private readonly config: CustomVoiceProviderConfig) {}

  async synthesize(request: VoiceRequest): Promise<VoiceResponse> {
    const response = await axios.post(
      this.config.endpoint,
      {
        tenantId: request.tenantId,
        userId: request.userId,
        text: request.text,
        voiceId: request.voiceId,
        sentiment: request.sentiment,
        metadata: request.metadata,
      },
      {
        timeout: this.config.timeoutMs ?? 10000,
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          ...(this.config.headers ?? {}),
        },
      },
    );

    const data = response.data as { audioUrl?: string; audioBase64?: string; contentType?: string };

    return {
      provider: "custom",
      audioUrl: data.audioUrl,
      audioBase64: data.audioBase64,
      contentType: data.contentType,
    };
  }
}
