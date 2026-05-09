import type { LlmRequest, LlmResponse } from "../../contracts/interaction-types.js";

export interface LlmProvider {
  readonly name: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}
