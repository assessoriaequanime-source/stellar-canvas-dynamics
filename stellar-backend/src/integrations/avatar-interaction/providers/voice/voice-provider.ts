import type { VoiceRequest, VoiceResponse } from "../../contracts/interaction-types";

export interface VoiceProvider {
  readonly name: string;
  synthesize(request: VoiceRequest): Promise<VoiceResponse>;
}
