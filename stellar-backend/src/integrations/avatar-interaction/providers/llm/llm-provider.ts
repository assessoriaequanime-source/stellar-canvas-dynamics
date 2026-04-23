import type { LlmRequest, LlmResponse } from "../../contracts/interaction-types";

export interface LlmProvider {
  readonly name: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}
