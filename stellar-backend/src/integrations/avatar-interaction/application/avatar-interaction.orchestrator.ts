import type {
  AvatarInteractionResult,
  LlmRequest,
  VoiceRequest,
} from "../contracts/interaction-types";
import { getAvatarProviders } from "../registry/provider-registry";

export async function executeAvatarInteraction(
  llmRequest: LlmRequest,
  voiceRequestBase?: Omit<VoiceRequest, "text">,
): Promise<AvatarInteractionResult> {
  const providers = getAvatarProviders();

  if (!providers.llm) {
    throw new Error("LLM provider not configured");
  }

  const llmResult = await providers.llm.generate(llmRequest);

  if (!providers.voice || !voiceRequestBase) {
    return {
      text: llmResult.text,
    };
  }

  const audio = await providers.voice.synthesize({
    ...voiceRequestBase,
    text: llmResult.text,
  });

  return {
    text: llmResult.text,
    audio,
  };
}
