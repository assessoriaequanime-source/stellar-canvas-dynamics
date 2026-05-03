# Avatar Interaction Expansion Scaffold

Status: pending expansion (no runtime wiring yet).

This folder prepares a provider-based architecture for:
- sentimental voice synthesis (ElevenLabs)
- user-owned model API integration (custom provider)

Current backend behavior is unchanged. These files are contracts and stubs only.

## Proposed flow (future)

1. avatar message route receives user input
2. LLM provider generates response text
3. Voice provider synthesizes audio from response text
4. API returns text + optional audio URL/base64

## Design rules

- Keep provider contracts stable and framework-agnostic.
- Use feature flags before enabling in runtime.
- Keep custom provider isolated per tenant/user to avoid data leakage.
- Validate consent before voice synthesis when required.
