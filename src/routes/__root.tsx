import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

import appCss from "../styles.css?url";
import WalletOnboarding from "@/components/WalletOnboarding";

const LOCAL_SESSION_KEY = "singulai_session";
const LOCAL_USER_KEY = "singulai_user";
const LOCAL_WALLET_KEY = "singulai_wallet";
const DEMO_WALLET_KEY = "singulai_demo_wallet";
const AUTH_QUERY_PARAMS = ["auth", "session", "user", "wallet", "access"];
const PUBLIC_PATHS = new Set(["/demo", "/"]);

// Fixed public demo wallet for jurors — auditable on Solana Devnet explorer
const JUDGE_WALLET_ADDRESS = "SingulAIJudge1AvatarPro1Hackathon1Devnet111";
const JUDGE_SGL_BALANCE = 1000;

function isJudgeAccess() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("access") === "judge";
}

function hasStoredWallet() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(DEMO_WALLET_KEY);
}

function setJudgeSession() {
  const addr = JUDGE_WALLET_ADDRESS;
  localStorage.setItem(DEMO_WALLET_KEY, addr);
  localStorage.setItem(LOCAL_SESSION_KEY, `judge-session-${addr.slice(0, 8)}`);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({
    id: "judge-avatarpro-demo",
    name: "Hackathon Judge",
    email: "judge@singulai.live",
    walletAddress: addr,
    sglBalance: JUDGE_SGL_BALANCE,
  }));
  localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify({
    address: addr,
    walletAddress: addr,
    network: "solana-devnet",
    chainId: "devnet",
    type: "avatarpro_judge",
    sglBalance: JUDGE_SGL_BALANCE,
  }));
}

function removeQueryParam(key: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.has(key)) {
    url.searchParams.delete(key);
    window.history.replaceState({}, document.title, url.toString());
  }
}

function removeQueryParams() {
  const url = new URL(window.location.href);
  let hasChanges = false;
  AUTH_QUERY_PARAMS.forEach((key) => {
    if (url.searchParams.has(key)) { url.searchParams.delete(key); hasChanges = true; }
  });
  if (!hasChanges) return;
  const nextSearch = url.searchParams.toString();
  url.search = nextSearch ? `?${nextSearch}` : "";
  window.history.replaceState({}, document.title, url.toString());
}

void removeQueryParam; // used inline below

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function isPublicPath() {
  if (typeof window === "undefined") return false;
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_PATHS.has(normalizedPath);
}




export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SingulAI — Intelligence Beyond Limits" },
      { name: "description", content: "SingulAI Dashboard with neural particles, Omega index, and digital legacy." },
      { property: "og:title", content: "SingulAI — Intelligence Beyond Limits" },
      { property: "og:description", content: "SingulAI Dashboard with neural particles, Omega index, and digital legacy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SingulAI — Intelligence Beyond Limits" },
      { name: "twitter:description", content: "SingulAI Dashboard with neural particles, Omega index, and digital legacy." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/40da9729-d247-4f58-96ef-993cd1d7b10b/id-preview-ec55e181--b2f10f05-bea7-4ee5-b675-635f50af0b44.lovable.app-1776577002653.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/40da9729-d247-4f58-96ef-993cd1d7b10b/id-preview-ec55e181--b2f10f05-bea7-4ee5-b675-635f50af0b44.lovable.app-1776577002653.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Cinzel:wght@400;500&family=IM+Fell+English:ital@1&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [authState, setAuthState] = useState<"loading" | "onboarding" | "ready">("loading");
  const triedAuth = useRef(false);

  const handleOnboardingSuccess = () => setAuthState("ready");

  useEffect(() => {
    if (triedAuth.current) return;
    triedAuth.current = true;

    // Public paths (/, /demo) → no auth gate
    if (isPublicPath()) {
      setAuthState("ready");
      return;
    }

    // Judge bypass: ?access=judge → fixed public demo wallet, instant entry
    if (isJudgeAccess()) {
      setJudgeSession();
      removeQueryParams();
      setAuthState("ready");
      return;
    }

    // Returning user with stored demo wallet → WalletOnboarding handles reconnect
    if (hasStoredWallet()) {
      setAuthState("onboarding"); // WalletOnboarding will auto-reconnect and call onSuccess
      return;
    }

    // New user → show WalletOnboarding to create wallet
    setAuthState("onboarding");
  }, []);

  if (authState === "loading") {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", background: "#0b0b0b" }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Initializing…</div>
      </div>
    );
  }

  if (authState === "onboarding") {
    return <WalletOnboarding onSuccess={handleOnboardingSuccess} />;
  }

  return <Outlet />;
}
