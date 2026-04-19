import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

import appCss from "../styles.css?url";

const AUTH_START_URL = "https://singulai.site/api/auth/google";
const VERIFY_SESSION_URL = "https://singulai.site/api/auth/verify-session";
const LOCAL_SESSION_KEY = "singulai_session";
const LOCAL_USER_KEY = "singulai_user";
const LOCAL_WALLET_KEY = "singulai_wallet";
const REDIRECT_ATTEMPT_KEY = "singulai_auth_redirect_attempt";

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

function removeQueryParams() {
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, document.title, url.toString());
}

function redirectToAuth() {
  if (sessionStorage.getItem(REDIRECT_ATTEMPT_KEY)) return;
  sessionStorage.setItem(REDIRECT_ATTEMPT_KEY, "1");
  window.location.href = AUTH_START_URL;
}

async function verifySession(sessionToken: string) {
  try {
    const response = await fetch(VERIFY_SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionToken }),
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
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
        href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap",
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
  const [ready, setReady] = useState(false);
  const triedRedirect = useRef(false);

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const authSource = params.get("auth");
      const session = params.get("session");
      const userParam = params.get("user");
      const walletParam = params.get("wallet");

      if (authSource === "google" && session) {
        localStorage.setItem(LOCAL_SESSION_KEY, session);

        const user = parseJsonParam(userParam);
        if (user) {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
        }

        const wallet = parseJsonParam(walletParam);
        if (wallet) {
          localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallet));
        }

        removeQueryParams();
      }

      const sessionToken = localStorage.getItem(LOCAL_SESSION_KEY);
      if (!sessionToken) {
        redirectToAuth();
        return;
      }

      const verification = await verifySession(sessionToken);
      const sessionValid =
        verification?.valid === true ||
        (verification?.user && typeof verification.user === "object");

      if (!verification || !sessionValid) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem(LOCAL_USER_KEY);
        localStorage.removeItem(LOCAL_WALLET_KEY);
        redirectToAuth();
        return;
      }

      if (verification.user) {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(verification.user));
      }
      if (verification.wallet) {
        localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(verification.wallet));
      }

      setReady(true);
    };

    if (!triedRedirect.current) {
      triedRedirect.current = true;
      handleAuth();
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center text-sm text-muted-foreground">Validating session…</div>
      </div>
    );
  }

  return <Outlet />;
}
