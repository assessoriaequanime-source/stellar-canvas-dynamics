import { requestJson } from "./http";

export function getAuditHistory() {
  return requestJson<Array<Record<string, unknown>>>("/audit/events");
}

export function getSessionHistory() {
  return requestJson<Array<Record<string, unknown>>>("/transaction");
}

export function getProofEvents() {
  return requestJson<Array<Record<string, unknown>>>("/audit/events?type=proof");
}
