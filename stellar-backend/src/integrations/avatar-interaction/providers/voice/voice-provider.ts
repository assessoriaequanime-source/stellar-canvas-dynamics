import type { VoiceRequest, VoiceResponse } from "../../contracts/interaction-types.js";

export interface VoiceProvider {
  readonly name: string;
  synthesize(request: VoiceRequest): Promise<VoiceResponse>;
}
