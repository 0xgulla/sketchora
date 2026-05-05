import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import App from "./App";
import LandingPage from "./components/LandingPage";
import type { CanvasConfig } from "./components/NewCanvasModal";
import PageTransitionLoader from "./components/PageTransitionLoader";
import UserGuidePage from "./components/UserGuidePage";
import { useWeb3Auth } from "./hooks/useWeb3Auth";

type View = "landing" | "app" | "guide";

function pathnameToView(pathname: string): View {
  if (pathname === "/draw" || pathname.startsWith("/draw/")) return "app";
  if (pathname === "/guide" || pathname.startsWith("/guide/")) return "guide";
  return "landing";
}

export default function Root() {
  const {
    isAuthenticated,
    walletAddress,
    ensName,
    logout,
    isLoading: authLoading,
  } = useWeb3Auth();
  // Use Wagmi's status directly to detect hydration phase
  const { status: wagmiStatus } = useAccount();
  const wagmiHydrating =
    wagmiStatus === "connecting" || wagmiStatus === "reconnecting";

  const [view, setView] = useState<View>(() =>
    pathnameToView(window.location.pathname),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [walletRequiredToast, setWalletRequiredToast] = useState(false);
  // Canvas config chosen in NewCanvasModal on the landing page
  const canvasConfigRef = useRef<CanvasConfig | null>(null);

  // Sync URL → view on browser back/forward
  useEffect(() => {
    const onPop = () => setView(pathnameToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // "/" → show landing page (not /draw)
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/");
      setView("landing");
    }
  }, []);

  // If user tries to access /draw without auth → redirect to landing + show toast.
  // CRITICAL: only run this gate AFTER Wagmi has fully hydrated (not while
  // status is "connecting" / "reconnecting"), otherwise we race and bounce
  // the user to landing before the wallet state resolves.
  useEffect(() => {
    if (wagmiHydrating || authLoading) return; // still hydrating — do nothing
    if (view === "app" && !isAuthenticated) {
      setWalletRequiredToast(true);
      window.history.replaceState(null, "", "/");
      setView("landing");
      const t = setTimeout(() => setWalletRequiredToast(false), 4500);
      return () => clearTimeout(t);
    }
  }, [view, isAuthenticated, wagmiHydrating, authLoading]);

  const navigate = (next: View) => {
    setIsLoading(true);
    const pathMap: Record<View, string> = {
      app: "/draw",
      guide: "/guide",
      landing: "/",
    };
    setTimeout(() => {
      window.history.pushState(null, "", pathMap[next]);
      setView(next);
      setIsLoading(false);
    }, 500);
  };

  // LandingPage "Start Drawing" handler — gate on auth
  const handleLaunchApp = () => {
    if (!isAuthenticated) {
      setWalletRequiredToast(true);
      setTimeout(() => setWalletRequiredToast(false), 4000);
      return;
    }
    navigate("app");
  };

  // Called from NewCanvasModal via LandingPage — receives chosen canvas config
  const handleGoToDraw = (config?: CanvasConfig) => {
    if (!isAuthenticated) {
      setWalletRequiredToast(true);
      setTimeout(() => setWalletRequiredToast(false), 4000);
      return;
    }
    if (config) canvasConfigRef.current = config;
    navigate("app");
  };

  // While Wagmi is hydrating and the URL is /draw, show a loading spinner
  // instead of bouncing to landing or showing a blank page.
  const isWalletResolving = (wagmiHydrating || authLoading) && view === "app";

  const effectiveView: View =
    view === "app" && !isAuthenticated && !wagmiHydrating && !authLoading
      ? "landing"
      : view;

  return (
    <>
      <PageTransitionLoader isLoading={isLoading} />

      {/* Wallet hydration loading screen — shown while Wagmi reconnects on /draw */}
      {isWalletResolving && (
        <div
          data-ocid="root.wallet_loading_state"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0d0a1a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid rgba(168,85,247,0.2)",
              borderTop: "3px solid #a855f7",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Connecting wallet…
          </span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Wallet required toast */}
      {walletRequiredToast && (
        <div
          data-ocid="root.wallet_required_toast"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: "rgba(15,10,35,0.97)",
            border: "1px solid rgba(245,158,11,0.4)",
            borderRadius: 14,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            animation: "toastIn 0.3s cubic-bezier(.22,1,.36,1) both",
            whiteSpace: "nowrap",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          <span style={{ fontSize: 18 }}>🔒</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fbbf24",
            }}
          >
            Wallet connection required. Please connect your wallet first.
          </span>
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateX(-50%) translateY(12px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {effectiveView === "app" && isAuthenticated && (
        <div
          key="app-canvas-mount"
          style={{ animation: "canvasFadeIn 0.4s ease-in both" }}
        >
          <style>
            {
              "@keyframes canvasFadeIn { from { opacity: 0; } to { opacity: 1; } }"
            }
          </style>
          <App
            onGoHome={() => navigate("landing")}
            web3WalletAddress={walletAddress}
            web3EnsName={ensName}
            isWeb3Auth={isAuthenticated}
            initialView="app"
            initialCanvasConfig={canvasConfigRef.current ?? undefined}
          />
        </div>
      )}

      {effectiveView === "landing" && !isWalletResolving && (
        <LandingPage
          onLaunchApp={handleLaunchApp}
          onShowGuide={() => navigate("guide")}
          onGoToDraw={handleGoToDraw}
          isAuthenticated={isAuthenticated}
          onLogout={() => void logout()}
        />
      )}

      {effectiveView === "guide" && (
        <UserGuidePage onGoHome={() => navigate("landing")} />
      )}
    </>
  );
}
