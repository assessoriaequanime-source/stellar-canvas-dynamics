function envFlagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "1";
}

export function isExplicitAvatarProDemoMode(): boolean {
  return (
    envFlagEnabled(import.meta.env.VITE_ENABLE_MOCK_VAULT) ||
    envFlagEnabled(import.meta.env.VITE_DEV_SIMPLE_TEST_AUTH) ||
    envFlagEnabled(import.meta.env.VITE_SIMPLE_TEST_AUTH)
  );
}

export const DEMO_WALLET_ADDRESS = "DemoWallet111111111111111111111111111111111";
export const DEMO_AVATAR_ID = "avatarpro-demo-001";
