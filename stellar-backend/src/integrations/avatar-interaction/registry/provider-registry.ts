import type { LlmProvider } from "../providers/llm/llm-provider.js";
import type { VoiceProvider } from "../providers/voice/voice-provider.js";

export type AvatarProviderRegistry = {
  llm?: LlmProvider;
  voice?: VoiceProvider;
};

const registry: AvatarProviderRegistry = {};

export function setAvatarProviders(next: AvatarProviderRegistry): void {
  registry.llm = next.llm;
  registry.voice = next.voice;
}

export function getAvatarProviders(): AvatarProviderRegistry {
  return registry;
}
