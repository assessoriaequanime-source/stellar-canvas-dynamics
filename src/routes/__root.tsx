import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

import appCss from "../styles.css?url";
import { verifyAltSession } from "@/lib/altApi";
import SimpleDemoLogin from "@/components/SimpleDemoLogin";

const LOCAL_SESSION_KEY = "singulai_session";
const LOCAL_USER_KEY = "singulai_user";
const LOCAL_WALLET_KEY = "singulai_wallet";
const AUTH_QUERY_PARAMS = ["auth", "session", "user", "wallet"];
const PUBLIC_PATHS = new Set(["/demo"]);

const DEV_SIMPLE_TEST_AUTH = import.meta.env.VITE_SIMPLE_TEST_AUTH === "1";
const DEV_SIMPLE_AUTH_HOSTNAMES = ["localhost", "127.0.0.1"];
const DEV_SIMPLE_AUTH_SESSION = "dev-session-singulai-live";
const DEV_SIMPLE_AUTH_USER = {
  id: "dev_user_singulai_live",
  name: "SingulAI Test User",
  email: "dev@singulai.live",
  walletAddress: "0x0000000000000000000000000000000000000000",
  sglBalance: 10000,
};
const DEV_SIMPLE_AUTH_WALLET = {
  address: "0x0000000000000000000000000000000000000000",
  walletAddress: "0x0000000000000000000000000000000000000000",
  network: "sepolia",
  chainId: 11155111,
  type: "native_singulai_dev",
};

function isDevSimpleAuthMode() {
  return (
    DEV_SIMPLE_TEST_AUTH &&
    typeof window !== "undefined" &&
    DEV_SIMPLE_AUTH_HOSTNAMES.includes(window.location.hostname)
  );
}

function useDevSimpleAuthSession() {
  localStorage.setItem(LOCAL_SESSION_KEY, DEV_SIMPLE_AUTH_SESSION);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEV_SIMPLE_AUTH_USER));
  localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(DEV_SIMPLE_AUTH_WALLET));
}

function DevTestAuthBadge() {
  return (
    <div
      style={{
        position: "fixed",
        top: "max(10px, env(safe-area-inset-top, 0px) + 10px)",
        right: 12,
        zIndex: 9999,
        padding: "5px 8px",
        fontSize: "10px",
        lineHeight: 1,
        background: "rgba(11, 11, 11, 0.88)",
        color: "rgba(255, 255, 255, 0.78)",
        borderRadius: "10px",
        border: "1px solid rgba(38, 176, 226, 0.22)",
        pointerEvents: "none",
        opacity: 0.78,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      DEV TEST AUTH
    </div>
  );
}

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

function parseJsonParam(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

function isPublicPath() {
  if (typeof window === "undefined") return false;
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_PATHS.has(normalizedPath);
}

function removeQueryParams() {
  const url = new URL(window.location.href);
  let hasChanges = false;

  AUTH_QUERY_PARAMS.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasChanges = true;
    }
  });

  if (!hasChanges) return;

  const nextSearch = url.searchParams.toString();
  url.search = nextSearch ? `?${nextSearch}` : "";
  window.history.replaceState({}, document.title, url.toString());
}



export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SingulAI — Intelligence Beyond Limits" },
      { name: "description", content: "Dashboard SingulAI — partículas neurais, índice Ω e legados digitais." },
      { property: "og:title", content: "SingulAI — Intelligence Beyond Limits" },
      { property: "og:description", content: "Dashboard SingulAI — partículas neurais, índice Ω e legados digitais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SingulAI — Intelligence Beyond Limits" },
      { name: "twitter:description", content: "Dashboard SingulAI — partículas neurais, índice Ω e legados digitais." },
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
  const [authState, setAuthState] = useState<"loading" | "login" | "ready">("loading");
  const triedAuth = useRef(false);

  const handleLoginSuccess = () => setAuthState("ready");

  useEffect(() => {
    const handleAuth = async () => {
      if (isPublicPath()) {
        setAuthState("ready");
        return;
      }

      if (isDevSimpleAuthMode()) {
        useDevSimpleAuthSession();
        removeQueryParams();
        setAuthState("ready");
        return;
      }

      removeQueryParams();

      const sessionToken = localStorage.getItem(LOCAL_SESSION_KEY);
      if (!sessionToken) {
        setAuthState("login");
        return;
      }

      const verification = await verifyAltSession(sessionToken);
      const sessionValid =
        verification?.valid === true ||
        (verification != null && "user" in verification && typeof verification.user === "object");

      if (!verification || !sessionValid) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem(LOCAL_USER_KEY);
        localStorage.removeItem(LOCAL_WALLET_KEY);
        setAuthState("login");
        return;
      }

      if (verification.user) {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(verification.user));
      }
      if (verification.wallet) {
        localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(verification.wallet));
      }

      setAuthState("ready");
    };

    if (!triedAuth.current) {
      triedAuth.current = true;
      handleAuth();
    }
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center text-sm text-muted-foreground">Inicializando…</div>
      </div>
    );
  }

  if (authState === "login") {
    return <SimpleDemoLogin onSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Outlet />
      {isDevSimpleAuthMode() ? <DevTestAuthBadge /> : null}
    </>
  );
}
