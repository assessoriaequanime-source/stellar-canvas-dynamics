import axios from "axios";
import type { LlmProvider } from "../llm-provider";
import type { LlmRequest, LlmResponse } from "../../../contracts/interaction-types";

export type CustomLlmProviderConfig = {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export class CustomLlmProvider implements LlmProvider {
  public readonly name = "custom";

  constructor(private readonly config: CustomLlmProviderConfig) {}

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const response = await axios.post(
      this.config.endpoint,
      {
        tenantId: request.tenantId,
        userId: request.userId,
        modelId: request.modelId,
        message: request.message,
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

    const data = response.data as { text: string; model?: string; usage?: { promptTokens?: number; completionTokens?: number } };

    return {
      text: data.text,
      provider: "custom",
      model: data.model,
      usage: data.usage,
    };
  }
}
