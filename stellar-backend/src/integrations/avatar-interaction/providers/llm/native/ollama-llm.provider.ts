import axios from "axios";
import type { LlmProvider } from "../llm-provider";
import type { LlmRequest, LlmResponse } from "../../../contracts/interaction-types";

export type OllamaProviderConfig = {
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
};

export class OllamaLlmProvider implements LlmProvider {
  public readonly name = "native";

  constructor(private readonly config: OllamaProviderConfig = {}) {}

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const endpoint = this.config.endpoint || "http://127.0.0.1:11434/api/generate";
    const model = this.config.model || request.modelId || "llama3.1:8b";

    const response = await axios.post(
      endpoint,
      {
        model,
        prompt: request.message,
        stream: false,
      },
      {
        timeout: this.config.timeoutMs ?? 15000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = response.data as { response?: string; eval_count?: number; prompt_eval_count?: number };

    return {
      text: (data.response || "").trim(),
      provider: "native",
      model,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
      },
    };
  }
}
