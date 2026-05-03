import axios from "axios";
import type { VoiceProvider } from "../voice-provider";
import type { VoiceRequest, VoiceResponse } from "../../../contracts/interaction-types";

export class ElevenLabsVoiceProvider implements VoiceProvider {
  public readonly name = "elevenlabs";

  constructor(
    private readonly apiKey: string,
    private readonly apiBase: string = "https://api.elevenlabs.io/v1",
  ) {}

  async synthesize(request: VoiceRequest): Promise<VoiceResponse> {
    // Stub implementation: this is intentionally safe for expansion phase.
    // TODO: implement exact endpoint strategy (streaming vs non-streaming).
    if (!this.apiKey) {
      throw new Error("ELEVENLABS_API_KEY is missing");
    }

    const voiceId = request.voiceId || "default";
    const endpoint = `${this.apiBase}/text-to-speech/${voiceId}`;

    await axios.post(
      endpoint,
      {
        text: request.text,
      },
      {
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    return {
      provider: "elevenlabs",
      contentType: "audio/mpeg",
      // TODO: return binary payload or signed media URL.
    };
  }
}
