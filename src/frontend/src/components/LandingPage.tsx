import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useToast } from "../components/ToastNotifications";
import { type TxPurpose, useUSDCPayment } from "../hooks/useUSDCPayment";
import { useWeb3Auth } from "../hooks/useWeb3Auth";
import { Notifications } from "../lib/notifications";
import { checkPaidAccess } from "../lib/usdcPayment";
import { isOKXWallet } from "../lib/walletDetection";
import DisconnectConfirmModal from "./DisconnectConfirmModal";
import NewCanvasModal, { type CanvasConfig } from "./NewCanvasModal";
import TransactionModal from "./TransactionModal";
import WalletPortfolioDropdown from "./WalletPortfolioDropdown";

interface LandingPageProps {
  onLaunchApp: () => void;
  onShowGuide?: () => void;
  /** @deprecated use isAuthenticated + onGoToDraw instead */
  onShowLogin?: () => void;
  /** Called when user is authenticated and clicks Start Drawing — receives canvas config */
  onGoToDraw?: (config?: CanvasConfig) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

/* ─── Scroll-reveal hook ────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({
  children,
  delay = 0,
  style,
  from = "bottom",
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  from?: "bottom" | "left" | "right";
}) {
  const { ref, visible } = useInView();
  const startTransform =
    from === "left"
      ? "translateX(-40px)"
      : from === "right"
        ? "translateX(40px)"
        : "translateY(32px)";
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0)" : startTransform,
        transition: `opacity 0.75s ${delay}ms cubic-bezier(.22,1,.36,1), transform 0.75s ${delay}ms cubic-bezier(.22,1,.36,1)`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function useTypewriter(text: string, speed = 42) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    setDone(false);
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

function useCountUp(target: number, duration = 1600) {
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - (1 - t) ** 3;
            el.textContent = Math.round(ease * target).toString();
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return ref;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ─── Wallet Navbar Button ────────────────────────────────────── */
function WalletNavButton({
  isAuthenticated,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  const { address } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDisconnect = () => {
    setShowDropdown(false);
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = () => {
    setShowDisconnectModal(false);
    onLogout();
  };

  if (!isAuthenticated) {
    return (
      <>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              type="button"
              data-ocid="nav.login_button"
              className="btn-glow"
              onClick={openConnectModal}
              style={{
                background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 700,
                transition: "transform 0.18s, box-shadow 0.18s",
                boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                padding: "8px 22px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      </>
    );
  }

  // Authenticated state — show shortened address
  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        data-ocid="nav.wallet_address_button"
        onClick={() => setShowDropdown((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 16px",
          borderRadius: 999,
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.35)",
          cursor: "pointer",
          transition: "all 0.18s",
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: 700,
          color: "#c4b5fd",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(139,92,246,0.22)";
          e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(139,92,246,0.12)";
          e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)";
        }}
      >
        {/* Green connected dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#10b981",
            flexShrink: 0,
            boxShadow: "0 0 8px rgba(16,185,129,0.8)",
          }}
        />
        {address ? truncateAddress(address) : "Connected"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {showDropdown && (
        <WalletPortfolioDropdown
          onDisconnectRequest={handleDisconnect}
          onClose={() => setShowDropdown(false)}
        />
      )}

      {showDisconnectModal && (
        <DisconnectConfirmModal
          onConfirm={handleConfirmDisconnect}
          onCancel={() => setShowDisconnectModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Main Landing Page ───────────────────────────────────────── */
export default function LandingPage({
  onLaunchApp,
  onShowGuide = () => {},
  onGoToDraw,
  isAuthenticated = false,
  onLogout = () => {},
}: LandingPageProps) {
  const [launched, setLaunched] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const processingToastId = useRef<string | undefined>(undefined);
  const walletNotifiedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const { address, chainId } = useAccount();
  const { showToast, dismissToast } = useToast();
  const {
    sendPayment,
    txStep,
    txHash,
    txError,
    isPending,
    reset: resetTx,
  } = useUSDCPayment();
  const { displayed: tagline, done: taglineDone } = useTypewriter(
    "Create, draw, and design — all in one powerful canvas.",
    38,
  );

  const countRef1 = useCountUp(12);
  const countRef2 = useCountUp(30);
  const countRef3 = useCountUp(100);

  // Suppress unused variable warning — connectModalOpen used in ConnectButton.Custom
  void connectModalOpen;

  /* Allow page to scroll */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prev = {
      html: html.style.overflow,
      body: body.style.overflow,
      root: root?.style.overflow ?? "",
      rootHeight: root?.style.height ?? "",
    };
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
    }
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      if (root) {
        root.style.overflow = prev.root;
        root.style.height = prev.rootHeight;
      }
    };
  }, []);

  /* Animated hero canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    type Stroke = {
      points: { x: number; y: number }[];
      color: string;
      width: number;
      drawn: number;
      speed: number;
      opacity: number;
    };
    const curve = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ): { x: number; y: number }[] => {
      const pts: { x: number; y: number }[] = [];
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 0.3;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 0.3;
      for (let t = 0; t <= 1; t += 0.008)
        pts.push({
          x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2,
          y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t ** 2 * y2,
        });
      return pts;
    };
    const strokes: Stroke[] = [
      {
        points: curve(0.05, 0.55, 0.45, 0.25),
        color: "168,85,247",
        width: 3,
        drawn: 0,
        speed: 1.2,
        opacity: 0,
      },
      {
        points: curve(0.55, 0.15, 0.95, 0.55),
        color: "96,165,250",
        width: 4,
        drawn: 0,
        speed: 0.9,
        opacity: 0,
      },
      {
        points: curve(0.1, 0.82, 0.75, 0.68),
        color: "110,231,183",
        width: 2.5,
        drawn: 0,
        speed: 1.5,
        opacity: 0,
      },
      {
        points: curve(0.0, 0.3, 0.5, 0.7),
        color: "52,211,153",
        width: 3.5,
        drawn: 0,
        speed: 1.0,
        opacity: 0,
      },
      {
        points: curve(0.5, 0.9, 1.0, 0.2),
        color: "244,114,182",
        width: 2,
        drawn: 0,
        speed: 1.3,
        opacity: 0,
      },
      {
        points: curve(0.2, 0.1, 0.8, 0.5),
        color: "251,191,36",
        width: 2.8,
        drawn: 0,
        speed: 1.1,
        opacity: 0,
      },
    ];
    let last = 0;
    let idx = 0;
    const tick = (now: number) => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      if (now - last > 600 && idx < strokes.length) {
        strokes[idx].opacity = 0.6;
        last = now;
        idx++;
      }
      for (const s of strokes) {
        if (!s.opacity) continue;
        if (s.drawn < s.points.length)
          s.drawn = Math.min(s.points.length, s.drawn + s.speed * 2.5);
        const pts = s.points.slice(0, Math.floor(s.drawn));
        if (pts.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * W, pts[0].y * H);
        for (let i = 1; i < pts.length; i++)
          ctx.lineTo(pts[i].x * W, pts[i].y * H);
        ctx.strokeStyle = `rgba(${s.color},${s.opacity})`;
        ctx.lineWidth = s.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = `rgba(${s.color},0.4)`;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Show OKX recommendation + network warning once per session after wallet connect
  useEffect(() => {
    if (!isAuthenticated || walletNotifiedRef.current) return;
    // Mark shown once per browser session
    if (sessionStorage.getItem("okxReminderShown")) {
      walletNotifiedRef.current = true;
      return;
    }
    walletNotifiedRef.current = true;
    sessionStorage.setItem("okxReminderShown", "1");
    // Delay slightly so wallet state settles
    const t = setTimeout(() => {
      if (!isOKXWallet()) {
        Notifications.walletRecommendation(showToast);
      }
      if (chainId !== 5042002) {
        Notifications.networkWarning(showToast);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [isAuthenticated, chainId, showToast]);

  // Toast driven by txStep transitions
  useEffect(() => {
    if (txStep === "processing" || txStep === "waiting_wallet") {
      if (!processingToastId.current) {
        processingToastId.current =
          Notifications.transactionProcessing(showToast);
      }
    } else if (txStep === "success") {
      Notifications.transactionSuccess(
        showToast,
        dismissToast,
        processingToastId.current,
      );
      processingToastId.current = undefined;
    } else if (txStep === "failed") {
      const retryFn = () => {
        resetTx();
        sendPayment("unlock" as TxPurpose);
      };
      Notifications.transactionFailed(
        showToast,
        dismissToast,
        processingToastId.current,
        retryFn,
      );
      processingToastId.current = undefined;
    }
  }, [txStep, dismissToast, sendPayment, resetTx, showToast]);

  // Auto-open canvas modal after successful payment
  useEffect(() => {
    if (txStep === "success" && address) {
      const t = setTimeout(() => {
        setShowCanvasModal(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [txStep, address]);

  const handleStartDrawing = useCallback(() => {
    if (!isAuthenticated) {
      Notifications.walletRecommendation(showToast);
      setConnectModalOpen(true);
      return;
    }
    // Check paid access
    if (address && !checkPaidAccess(address)) {
      if (!isPending) {
        Notifications.firstTimeUnlock(showToast);
        sendPayment("unlock" as TxPurpose);
      }
      return;
    }
    // Already paid — go straight to canvas setup
    setShowCanvasModal(true);
  }, [isAuthenticated, address, sendPayment, isPending, showToast]);

  const handleCanvasConfirm = useCallback(
    (config: CanvasConfig) => {
      setShowCanvasModal(false);
      setLaunched(true);
      setTimeout(() => {
        if (onGoToDraw) onGoToDraw(config);
        else onLaunchApp();
      }, 500);
    },
    [onGoToDraw, onLaunchApp],
  );

  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  } as const;

  const purpleBtn = {
    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.18s, box-shadow 0.18s",
    boxShadow: "0 4px 32px rgba(139,92,246,0.45)",
  } as const;

  const ghostBtn = {
    background: "transparent",
    color: "rgba(240,234,255,0.8)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.18s, border-color 0.18s",
  } as const;

  // hoverPurple/leavePurple retained for nav button (non-btn-glow contexts)
  const _hoverPurple = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "scale(1.06) translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 8px 48px rgba(139,92,246,0.65)";
  };
  const _leavePurple = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "";
    e.currentTarget.style.boxShadow = "0 4px 32px rgba(139,92,246,0.45)";
  };
  const hoverGhost = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
  };
  const leaveGhost = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
  };

  const features = [
    {
      icon: "🖌️",
      title: "Brush Engine",
      desc: "Pressure-sensitive strokes with size, opacity and hardness control",
    },
    {
      icon: "⌫",
      title: "True Eraser",
      desc: "Real transparency via destination-out compositing, not white paint",
    },
    {
      icon: "⬡",
      title: "12+ Shapes",
      desc: "Editable vector shapes: rect, ellipse, star, arrow, polygon and more",
    },
    {
      icon: "🎨",
      title: "Color Picker",
      desc: "Live HSB picker with 30-color history and instant swatch reuse",
    },
    {
      icon: "⚙️",
      title: "Canvas Resize",
      desc: "Square, Instagram, YouTube presets plus custom width/height",
    },
    {
      icon: "🌙",
      title: "3 Themes",
      desc: "Dark, Light, and Purple accent — all powered by CSS variables",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: "🔗",
      title: "Connect",
      desc: "Connect your Web3 wallet — MetaMask or WalletConnect",
    },
    {
      num: "02",
      icon: "✏️",
      title: "Draw",
      desc: "Use brushes, shapes, layers and the full toolkit to create",
    },
    {
      num: "03",
      icon: "📤",
      title: "Export",
      desc: "Download as PNG, JPG or save your project as .drw",
    },
  ];

  const orbs = [
    {
      w: 500,
      h: 500,
      top: "-10%",
      left: "-5%",
      color: "rgba(139,92,246,0.22)",
      blur: 80,
      dur: "18s",
      delay: "0s",
    },
    {
      w: 380,
      h: 380,
      top: "30%",
      right: "-8%",
      color: "rgba(6,182,212,0.18)",
      blur: 70,
      dur: "22s",
      delay: "-6s",
    },
    {
      w: 300,
      h: 300,
      top: "65%",
      left: "10%",
      color: "rgba(52,211,153,0.15)",
      blur: 60,
      dur: "16s",
      delay: "-3s",
    },
    {
      w: 280,
      h: 280,
      top: "15%",
      left: "45%",
      color: "rgba(244,114,182,0.12)",
      blur: 60,
      dur: "20s",
      delay: "-9s",
    },
    {
      w: 220,
      h: 220,
      top: "80%",
      right: "15%",
      color: "rgba(168,85,247,0.18)",
      blur: 50,
      dur: "14s",
      delay: "-4s",
    },
  ];

  const particles = [
    // Purple particles
    {
      size: 8,
      top: "18%",
      left: "8%",
      color: "#a855f7",
      delay: "0s",
      dur: "7s",
    },
    {
      size: 4,
      top: "30%",
      left: "15%",
      color: "rgba(20,184,166,0.85)",
      delay: "1.2s",
      dur: "9s",
    },
    {
      size: 12,
      top: "60%",
      left: "6%",
      color: "#3b82f6",
      delay: "0.5s",
      dur: "8s",
    },
    {
      size: 6,
      top: "75%",
      left: "20%",
      color: "rgba(52,211,153,0.8)",
      delay: "2s",
      dur: "10s",
    },
    {
      size: 10,
      top: "20%",
      right: "10%",
      color: "#a855f7",
      delay: "0.8s",
      dur: "8.5s",
    },
    {
      size: 7,
      top: "50%",
      right: "8%",
      color: "#06b6d4",
      delay: "1.5s",
      dur: "7.5s",
    },
    {
      size: 4,
      top: "80%",
      right: "18%",
      color: "#a855f7",
      delay: "0.3s",
      dur: "9.5s",
    },
    {
      size: 9,
      top: "40%",
      right: "25%",
      color: "rgba(110,231,183,0.75)",
      delay: "2.5s",
      dur: "11s",
    },
    {
      size: 3,
      top: "55%",
      left: "30%",
      color: "#a855f7",
      delay: "1.8s",
      dur: "6.5s",
    },
    {
      size: 11,
      top: "10%",
      left: "35%",
      color: "#06b6d4",
      delay: "3s",
      dur: "12s",
    },
    {
      size: 5,
      top: "90%",
      left: "45%",
      color: "rgba(244,114,182,0.8)",
      delay: "0.6s",
      dur: "8s",
    },
    {
      size: 6,
      top: "25%",
      right: "30%",
      color: "rgba(52,211,153,0.75)",
      delay: "2.2s",
      dur: "10.5s",
    },
    // Extra particles — spread across hero + below-fold
    {
      size: 2,
      top: "45%",
      left: "52%",
      color: "#3b82f6",
      delay: "0.9s",
      dur: "13s",
    },
    {
      size: 8,
      top: "68%",
      right: "40%",
      color: "#a855f7",
      delay: "3.5s",
      dur: "9s",
    },
    {
      size: 4,
      top: "85%",
      left: "62%",
      color: "#06b6d4",
      delay: "1.1s",
      dur: "7.8s",
    },
    {
      size: 6,
      top: "5%",
      right: "20%",
      color: "#a855f7",
      delay: "2.8s",
      dur: "11.5s",
    },
    {
      size: 3,
      top: "95%",
      right: "55%",
      color: "#3b82f6",
      delay: "0.4s",
      dur: "8.2s",
    },
    {
      size: 10,
      top: "38%",
      left: "72%",
      color: "rgba(168,85,247,0.7)",
      delay: "4s",
      dur: "10s",
    },
    {
      size: 5,
      top: "72%",
      left: "48%",
      color: "#06b6d4",
      delay: "2.6s",
      dur: "9.3s",
    },
    {
      size: 7,
      top: "15%",
      left: "58%",
      color: "#3b82f6",
      delay: "1.7s",
      dur: "14s",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#040614",
        color: "#f0eaff",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        opacity: launched ? 0 : 1,
        transform: launched ? "scale(1.03)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Transaction Modal */}
      <TransactionModal
        txStep={txStep}
        txHash={txHash}
        error={txError}
        onRetry={() => {
          resetTx();
          sendPayment("unlock" as TxPurpose);
        }}
        onClose={txStep === "success" ? resetTx : resetTx}
      />

      {/* Animated gradient bg */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          animation: "bgShift 12s ease-in-out infinite",
          willChange: "background",
        }}
      />

      {/* Static ambient */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(139,92,246,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(6,182,212,0.12) 0%, transparent 65%)",
        }}
      />

      {/* Animated grid overlay */}
      <div className="landing-grid-overlay" />

      {/* Floating orbs */}
      {orbs.map((orb) => (
        <div
          key={`orb-${orb.color}-${orb.dur}`}
          style={{
            position: "fixed",
            width: orb.w,
            height: orb.h,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            top: orb.top,
            left: "left" in orb ? (orb as { left: string }).left : undefined,
            right:
              "right" in orb ? (orb as { right: string }).right : undefined,
            filter: `blur(${orb.blur}px)`,
            pointerEvents: "none",
            zIndex: 0,
            animation: `orbFloat ${orb.dur} ${orb.delay} ease-in-out infinite`,
            willChange: "transform",
          }}
        />
      ))}

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          ...glass,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          animation: "navSlideDown 0.6s cubic-bezier(.22,1,.36,1) both",
        }}
      >
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10 }}
          data-ocid="nav.section"
        >
          <img
            src="/assets/logo.png"
            alt="Sketchora"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 0 20px rgba(124,58,237,0.5)",
              animation: "logoSpin 20s linear infinite",
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "-0.03em",
              background:
                "linear-gradient(135deg,#f0eaff 0%,#c4b5fd 50%,#6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Sketchora
          </span>
        </div>

        {/* Nav right */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            data-ocid="nav.guide_button"
            onClick={onShowGuide}
            style={{ ...ghostBtn, padding: "7px 18px", fontSize: 13 }}
            onMouseEnter={hoverGhost}
            onMouseLeave={leaveGhost}
          >
            Guide
          </button>
          <WalletNavButton
            isAuthenticated={isAuthenticated}
            onLogout={onLogout}
          />
          {isAuthenticated && (
            <button
              type="button"
              data-ocid="nav.start_drawing_button"
              className={isPending ? undefined : "btn-glow"}
              onClick={isPending ? undefined : handleStartDrawing}
              disabled={isPending}
              style={{
                ...purpleBtn,
                padding: "8px 20px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 7,
                animation: isPending
                  ? "none"
                  : "glowPulse 2.5s ease-in-out infinite",
                opacity: isPending ? 0.5 : 1,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
              Start Drawing
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px 60px",
          zIndex: 1,
        }}
      >
        {particles.map((p) => (
          <div
            key={`p-${p.top}-${p.dur}-${p.delay}`}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              top: p.top,
              left: "left" in p ? (p as { left: string }).left : undefined,
              right: "right" in p ? (p as { right: string }).right : undefined,
              pointerEvents: "none",
              animation: `heroFloat ${p.dur} ${p.delay} ease-in-out infinite`,
              zIndex: 0,
              filter: "blur(0.3px)",
              boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}`,
              willChange: "transform",
            }}
          />
        ))}

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 780,
            perspective: "1000px",
          }}
        >
          {/* Arc branding badge — enhanced */}
          <div
            data-ocid="hero.arc_badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 999,
              padding: "7px 18px 7px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#6ee7b7",
              marginBottom: 18,
              letterSpacing: "0.05em",
              animation: "fadeSlideUp 0.7s ease-out both",
              border: "1px solid rgba(168,85,247,0.45)",
              boxShadow:
                "0 0 20px rgba(168,85,247,0.18), inset 0 0 12px rgba(16,185,129,0.06)",
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(139,92,246,0.1) 100%)",
            }}
          >
            <span className="arc-pulse-dot" />
            <img
              src="/assets/arc-logo.png"
              alt="Arc Testnet"
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                objectFit: "cover",
                boxShadow: "0 0 8px rgba(16,185,129,0.6)",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            🟢 Powered by Arc Testnet — Fast • Low Fees • 1s Finality
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.4)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#c4b5fd",
              marginBottom: 32,
              letterSpacing: "0.04em",
              animation: "fadeSlideUp 0.7s 0.1s ease-out both",
            }}
          >
            <span style={{ animation: "sparkle 2s ease-in-out infinite" }}>
              ✦
            </span>
            Sketchora — Professional Drawing App
          </div>

          <h1
            style={{
              fontSize: "clamp(44px,9vw,92px)",
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: "-0.05em",
              marginBottom: 28,
              background:
                "linear-gradient(140deg,#ffffff 0%,#e0d4ff 25%,#c4b5fd 50%,#67e8f9 80%,#6ee7b7 100%)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation:
                "fadeSlideUp 0.75s 0.1s ease-out both, shimmerSlow 4s 1s linear infinite",
            }}
          >
            Sketchora
          </h1>

          <p
            style={{
              fontSize: "clamp(16px,2.5vw,22px)",
              lineHeight: 1.6,
              color: "rgba(240,234,255,0.75)",
              marginBottom: 44,
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
              minHeight: "2.4em",
              fontWeight: 500,
              animation: "fadeSlideUp 0.75s 0.2s ease-out both",
            }}
          >
            {tagline}
            <span
              style={{
                display: "inline-block",
                width: "2px",
                height: "1em",
                background: "#a78bfa",
                marginLeft: 3,
                verticalAlign: "middle",
                animation: taglineDone
                  ? "cursorBlink 1s step-end infinite"
                  : "none",
                opacity: taglineDone ? 1 : 0,
              }}
            />
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
              animation: "fadeSlideUp 0.75s 0.35s ease-out both",
            }}
          >
            {isAuthenticated ? (
              <button
                type="button"
                data-ocid="hero.primary_button"
                className={isPending ? undefined : "btn-glow"}
                onClick={isPending ? undefined : handleStartDrawing}
                disabled={isPending}
                style={{
                  ...purpleBtn,
                  padding: "16px 44px",
                  fontSize: 17,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  animation: isPending
                    ? "none"
                    : "glowPulse 2.5s 1s ease-in-out infinite",
                  fontFamily: "inherit",
                  opacity: isPending ? 0.5 : 1,
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                {isPending ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "txSpin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                    <circle cx="11" cy="11" r="2" />
                  </svg>
                )}
                {isPending ? "Processing..." : "Start Drawing"}
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    type="button"
                    data-ocid="hero.primary_button"
                    className="btn-glow"
                    onClick={openConnectModal}
                    style={{
                      ...purpleBtn,
                      padding: "16px 44px",
                      fontSize: 17,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      animation: "glowPulse 2.5s 1s ease-in-out infinite",
                      fontFamily: "inherit",
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Connect Wallet to Draw
                  </button>
                )}
              </ConnectButton.Custom>
            )}

            <button
              type="button"
              data-ocid="hero.secondary_button"
              style={{
                ...ghostBtn,
                padding: "16px 38px",
                fontSize: 17,
                fontFamily: "inherit",
                transition:
                  "background 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                e.currentTarget.style.transform =
                  "scale(1.03) translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 0 20px rgba(168,85,247,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Features
            </button>
          </div>

          {/* Payment/access hint */}
          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "rgba(240,234,255,0.35)",
              animation: "fadeSlideUp 0.75s 0.5s ease-out both",
            }}
            data-ocid="hero.access_hint"
          >
            {!isAuthenticated
              ? "🔒 Connect your wallet to unlock drawing"
              : address && !checkPaidAccess(address)
                ? "🔑 First access requires 0.1 USDC · Drawings always free after unlock"
                : "✅ Drawing access unlocked"}
          </p>
        </div>

        {/* Stats bar */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 56,
            display: "flex",
            gap: 40,
            justifyContent: "center",
            flexWrap: "wrap",
            animation: "fadeSlideUp 0.75s 0.5s ease-out both",
          }}
        >
          {[
            { label: "Shape Types", ref: countRef1, suffix: "+" },
            { label: "Color History", ref: countRef2, suffix: "" },
            { label: "Browser-Based", ref: countRef3, suffix: "%" },
          ].map(({ label, ref: cref, suffix }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(28px,4vw,40px)",
                  fontWeight: 800,
                  color: "#c4b5fd",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                <span ref={cref}>0</span>
                {suffix}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(240,234,255,0.45)",
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* App window mockup */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 60,
            maxWidth: 900,
            width: "100%",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "0 40px 120px rgba(139,92,246,0.3), 0 0 0 1px rgba(139,92,246,0.1)",
            animation: "fadeSlideUp 0.85s 0.55s ease-out both",
            transition:
              "transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform =
              "perspective(1200px) rotateX(2deg) translateY(-6px)";
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 60px 150px rgba(139,92,246,0.4), 0 0 0 1px rgba(139,92,246,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = "";
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 40px 120px rgba(139,92,246,0.3), 0 0 0 1px rgba(139,92,246,0.1)";
          }}
        >
          <div
            style={{
              background: "#0d0d1a",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {["#ff5f56", "#febc2e", "#28c840"].map((c) => (
              <div
                key={c}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: "rgba(240,234,255,0.35)",
                fontWeight: 500,
              }}
            >
              Sketchora — Untitled Project
            </span>
          </div>
          <div
            style={{
              background: "#0a0a18",
              height: 320,
              display: "flex",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 52,
                background: "#111128",
                borderRight: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 14,
                gap: 8,
              }}
            >
              {["✏️", "⌫", "⬡", "🪣", "🔤", "👆"].map((icon, i) => (
                <div
                  key={icon}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? "rgba(139,92,246,0.3)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      i === 0
                        ? "1px solid rgba(139,92,246,0.6)"
                        : "1px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1,
                position: "relative",
                background: "#0d0d1e",
                overflow: "hidden",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0.75,
                }}
                viewBox="0 0 600 320"
                aria-hidden="true"
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M 40 180 Q 120 60 220 140 Q 310 210 420 80"
                  stroke="#a78bfa"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
                <path
                  d="M 60 260 Q 160 200 260 230 Q 370 255 500 180"
                  stroke="#67e8f9"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="260"
                  cy="155"
                  rx="55"
                  ry="35"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="rgba(251,191,36,0.08)"
                />
                <rect
                  x="160"
                  y="210"
                  width="80"
                  height="50"
                  rx="6"
                  stroke="#34d399"
                  strokeWidth="2"
                  fill="rgba(52,211,153,0.07)"
                />
              </svg>
            </div>
            <div
              style={{
                width: 160,
                background: "#0f0f20",
                borderLeft: "1px solid rgba(255,255,255,0.07)",
                padding: "12px 10px",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(139,92,246,0.7)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                LAYERS
              </p>
              {["Layer 3", "Layer 2", "Layer 1"].map((name, i) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 8px",
                    borderRadius: 8,
                    marginBottom: 4,
                    background:
                      i === 0 ? "rgba(139,92,246,0.15)" : "transparent",
                    border:
                      i === 0
                        ? "1px solid rgba(139,92,246,0.3)"
                        : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 18,
                      borderRadius: 4,
                      background: [
                        "rgba(139,92,246,0.4)",
                        "rgba(96,165,250,0.3)",
                        "rgba(52,211,153,0.3)",
                      ][i],
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: i === 0 ? "#c4b5fd" : "rgba(240,234,255,0.4)",
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: "100px 24px",
          maxWidth: 1080,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp style={{ textAlign: "center", marginBottom: 60 }}>
          <h2
            style={{
              fontSize: "clamp(26px,5vw,48px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: 14,
              background: "linear-gradient(135deg,#f0eaff,#c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Everything you need to create
          </h2>
          <p
            style={{
              color: "rgba(240,234,255,0.5)",
              fontSize: 17,
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            A full drawing toolkit that runs entirely in your browser. No
            installs.
          </p>
        </FadeUp>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 20,
          }}
        >
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 80}>
              <div
                data-ocid={`features.card.${i + 1}`}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  height: "100%",
                  transition: "all 0.3s ease",
                  cursor: "default",
                  willChange: "transform",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(168,85,247,0.45)";
                  el.style.transform = "translateY(-8px) scale(1.02)";
                  el.style.boxShadow =
                    "inset 0 0 20px rgba(168,85,247,0.05), 0 0 40px rgba(168,85,247,0.12), 0 20px 60px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(168,85,247,0.2)";
                  el.style.transform = "translateY(0) scale(1)";
                  el.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 14,
                    display: "inline-block",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 8,
                    color: "#f0eaff",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "rgba(240,234,255,0.5)",
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 100px",
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp style={{ textAlign: "center", marginBottom: 64 }}>
          <h2
            style={{
              fontSize: "clamp(26px,5vw,48px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: 14,
              background: "linear-gradient(135deg,#f0eaff,#c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Simple as 1, 2, 3
          </h2>
          <p style={{ color: "rgba(240,234,255,0.5)", fontSize: 17 }}>
            Connect your wallet and start creating.
          </p>
        </FadeUp>
        <div
          style={{
            display: "flex",
            gap: 0,
            alignItems: "stretch",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.num}
              style={{
                display: "flex",
                alignItems: "stretch",
                flex: "1 1 220px",
                minWidth: 200,
              }}
            >
              <FadeUp
                delay={i * 150}
                from={i % 2 === 0 ? "left" : "right"}
                style={{ flex: 1 }}
              >
                <div
                  style={{
                    ...glass,
                    borderRadius: 20,
                    padding: "36px 28px",
                    textAlign: "center",
                    height: "100%",
                    position: "relative",
                    transition:
                      "transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-6px) scale(1.02)";
                    el.style.boxShadow = "0 20px 60px rgba(139,92,246,0.22)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "";
                    el.style.boxShadow = "";
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 12,
                      fontSize: 80,
                      fontWeight: 900,
                      color: "rgba(139,92,246,0.07)",
                      fontFamily: "monospace",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                      pointerEvents: "none",
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      color: "rgba(139,92,246,0.4)",
                      lineHeight: 1,
                      marginBottom: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.num}
                  </div>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      marginBottom: 10,
                      color: "#f0eaff",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "rgba(240,234,255,0.5)",
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </FadeUp>
            </div>
          ))}
        </div>
      </section>

      {/* ── ARC SECTION ──────────────────────────────────────── */}
      <section
        data-ocid="arc.section"
        style={{
          padding: "60px 24px 100px",
          maxWidth: 720,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        <FadeUp>
          <div
            style={{
              ...glass,
              borderRadius: 24,
              padding: "48px 36px",
              border: "1px solid rgba(16,185,129,0.2)",
              boxShadow: "0 0 60px rgba(16,185,129,0.08)",
            }}
          >
            <img
              src="/assets/arc-logo.png"
              alt="Arc Testnet"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: 20,
                boxShadow:
                  "0 0 30px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)",
                border: "2px solid rgba(16,185,129,0.4)",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 999,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                fontSize: 11,
                fontWeight: 700,
                color: "#6ee7b7",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                marginBottom: 16,
              }}
            >
              Powered by Arc Testnet
            </div>
            <h2
              style={{
                fontSize: "clamp(22px,4vw,34px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 12,
                color: "#f0eaff",
              }}
            >
              Fast · Low Fees · Web3 Drawing
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "rgba(240,234,255,0.55)",
                lineHeight: 1.7,
                maxWidth: 480,
                margin: "0 auto 24px",
              }}
            >
              Sketchora runs on Arc Testnet — a high-performance EVM chain with
              near-zero fees. Pay once in USDC to unlock drawing, then create
              freely forever.
            </p>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Chain ID", val: "5042002" },
                { label: "Currency", val: "USDC" },
                { label: "First access", val: "0.1 USDC" },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(240,234,255,0.4)",
                      marginBottom: 3,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: "#6ee7b7" }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "32px 32px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          position: "relative",
          zIndex: 1,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/assets/logo.png"
            alt="Sketchora"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              background: "linear-gradient(135deg,#c4b5fd,#6ee7b7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Sketchora
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="/assets/arc-logo.png"
            alt="Arc"
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span style={{ fontSize: 12, color: "rgba(240,234,255,0.3)" }}>
            Powered by Arc Testnet
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(240,234,255,0.25)" }}>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#a78bfa", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* Keyframes for inline spinners */}
      <style>{`
        @keyframes txSpin { to { transform: rotate(360deg); } }
        @keyframes heroFloat {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          25% { transform: translate(8px, -18px) scale(1.1); opacity: 0.9; }
          50% { transform: translate(-6px, -34px) scale(0.95); opacity: 0.6; }
          75% { transform: translate(10px, -22px) scale(1.05); opacity: 0.8; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20px, -30px) scale(1.06); }
          66% { transform: translate(18px, 20px) scale(0.96); }
        }
        @keyframes bgShift {
          0%, 100% { background: radial-gradient(ellipse 90% 70% at 15% 5%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 70% 55% at 85% 90%, rgba(6,182,212,0.08) 0%, transparent 60%); }
          50% { background: radial-gradient(ellipse 90% 70% at 85% 5%, rgba(6,182,212,0.12) 0%, transparent 60%), radial-gradient(ellipse 70% 55% at 15% 90%, rgba(139,92,246,0.08) 0%, transparent 60%); }
        }
        @keyframes navSlideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes logoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes shimmerSlow { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sparkle { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; } 50% { transform: scale(1.3) rotate(20deg); opacity: 1; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 4px 32px rgba(139,92,246,0.45); } 50% { box-shadow: 0 4px 48px rgba(139,92,246,0.75), 0 0 80px rgba(139,92,246,0.25); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes gridDrift { 0% { background-position: 0px 0px; } 50% { background-position: 20px 20px; } 100% { background-position: 0px 0px; } }
        @keyframes greenPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5), 0 0 6px rgba(16,185,129,0.8); } 50% { box-shadow: 0 0 0 5px rgba(16,185,129,0), 0 0 14px rgba(16,185,129,1); } }
      `}</style>

      {/* NewCanvasModal */}
      {showCanvasModal && (
        <NewCanvasModal
          isOpen={showCanvasModal}
          onConfirm={handleCanvasConfirm}
          onClose={() => setShowCanvasModal(false)}
        />
      )}
    </div>
  );
}
