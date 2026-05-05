import { ChevronRight, Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface UserGuidePageProps {
  onGoHome: () => void;
}

const LOGO_SRC = "/assets/logo.png";

const sidebarSections = [
  { id: "getting-started", label: "Getting Started", icon: "🚀" },
  { id: "drawing", label: "Drawing", icon: "🎨" },
  { id: "transactions", label: "Transactions", icon: "💳" },
  { id: "best-experience", label: "Best Experience", icon: "⚡" },
  { id: "troubleshooting", label: "Troubleshooting", icon: "🔧" },
];

const gettingStartedSteps = [
  {
    num: 1,
    icon: "🦊",
    title: "Connect Your Wallet",
    desc: "Click 'Connect Wallet' and choose your wallet. OKX Wallet recommended for the best Arc Network experience.",
  },
  {
    num: 2,
    icon: "🌐",
    title: "Switch to Arc Testnet",
    desc: "Make sure you're connected to Arc Testnet (Chain ID: 5042002). The app will prompt you to switch if needed.",
  },
  {
    num: 3,
    icon: "💰",
    title: "Complete One-Time Payment",
    desc: "Pay ~0.1 USDC on Arc Testnet to unlock lifetime drawing access. This is a one-time fee — no repeated charges.",
  },
  {
    num: 4,
    icon: "🎨",
    title: "Start Drawing",
    desc: "Click 'Start Drawing', choose your canvas size, and create! All drawing tools are now unlocked for life.",
  },
];

const drawingTools = [
  {
    icon: "🖌️",
    name: "Pen",
    desc: "Freehand drawing with adjustable size and opacity",
  },
  {
    icon: "📐",
    name: "Shapes",
    desc: "Rectangles, circles, triangles, and 12+ shape types",
  },
  { icon: "🎨", name: "Colors", desc: "30-color history, custom color picker" },
  {
    icon: "📄",
    name: "Layers",
    desc: "Multiple layers like Photoshop — add, hide, reorder",
  },
];

const transactionRows = [
  { action: "First-time drawing unlock", paid: true, fee: "0.1 USDC (once)" },
  { action: "Drawing again", paid: false, fee: "Free forever" },
  { action: "Download artwork", paid: true, fee: "0.1 USDC" },
  { action: "Update profile picture", paid: true, fee: "0.1 USDC" },
];

const bestExperienceTips = [
  {
    icon: "⚡",
    title: "Use OKX Wallet",
    desc: "OKX Wallet provides the most reliable connection to Arc Network with fewer failed transactions and faster confirmations.",
  },
  {
    icon: "📶",
    title: "Stay Connected",
    desc: "Keep a stable internet connection while drawing. Avoid switching networks or tabs during transactions.",
  },
  {
    icon: "⏸️",
    title: "Don't Refresh During Transactions",
    desc: "If a transaction is in progress, wait for it to complete. Refreshing may cause the transaction to appear stuck (it will resume automatically).",
  },
];

const troubleshootingItems = [
  {
    icon: "❌",
    title: "Transaction Failed",
    desc: "Click the 'Retry' button that appears after failure. If it keeps failing, check your USDC balance on Arc Testnet and make sure you have enough for the 0.1 USDC fee.",
  },
  {
    icon: "⚠️",
    title: "Wrong Network",
    desc: "Click 'Switch to Arc Testnet' when prompted. You must be on Arc Testnet (Chain ID: 5042002) for all transactions. Do not use Ethereum mainnet or other testnets.",
  },
  {
    icon: "🔌",
    title: "Wallet Not Connecting",
    desc: "Try using OKX Wallet. If your wallet is already connected but Sketchora doesn't recognize it, disconnect and reconnect from the wallet settings. Clear your browser cache if issues persist.",
  },
];

export default function UserGuidePage({ onGoHome }: UserGuidePageProps) {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const { id } of sidebarSections) {
      const el = sectionRefs.current[id];
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3, rootMargin: "-80px 0px -40% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => {
      for (const o of observers) o.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setSidebarOpen(false);
  };

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0d0d0f",
        color: "#f0f0f5",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(13,13,15,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(168,85,247,0.2)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={onGoHome}
          data-ocid="guide.home.link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 10,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(168,85,247,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          <img
            src={LOGO_SRC}
            alt="Sketchora"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              objectFit: "cover",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f0f0f5",
              letterSpacing: "-0.3px",
            }}
          >
            Sketchora
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            User Guide
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            data-ocid="guide.sidebar_toggle.button"
            style={{
              display: "none",
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "#a855f7",
              cursor: "pointer",
            }}
            className="guide-hamburger"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter")
                setSidebarOpen(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 49,
            }}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className="guide-sidebar"
          style={{
            width: 220,
            flexShrink: 0,
            position: "sticky",
            top: 57,
            height: "calc(100vh - 57px)",
            overflowY: "auto",
            background: "rgba(255,255,255,0.025)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            padding: "20px 12px",
            alignSelf: "flex-start",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              paddingLeft: 8,
            }}
          >
            Sections
          </p>
          {sidebarSections.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => scrollTo(s.id)}
              data-ocid={`guide.${s.id}.tab`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "none",
                background:
                  activeSection === s.id
                    ? "rgba(168,85,247,0.15)"
                    : "transparent",
                color:
                  activeSection === s.id ? "#a855f7" : "rgba(255,255,255,0.6)",
                fontWeight: activeSection === s.id ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                borderLeft:
                  activeSection === s.id
                    ? "2px solid #a855f7"
                    : "2px solid transparent",
                marginBottom: 2,
              }}
              onMouseEnter={(e) => {
                if (activeSection !== s.id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                if (activeSection !== s.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 15 }}>{s.icon}</span>
              {s.label}
              {activeSection === s.id && (
                <ChevronRight
                  size={13}
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              )}
            </button>
          ))}

          {/* Arc badge */}
          <div
            style={{
              marginTop: 24,
              padding: "10px",
              background: "rgba(168,85,247,0.07)",
              border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: 10,
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#a855f7",
                fontWeight: 700,
                fontSize: 12,
                marginBottom: 3,
              }}
            >
              🟢 Arc Testnet
            </div>
            Fast · Low Fees · 1s Finality
          </div>
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            padding: "40px 48px 80px",
          }}
          className="guide-main"
        >
          {/* Section 1: Getting Started */}
          <section
            ref={setRef("getting-started")}
            id="getting-started"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading
              icon="🚀"
              title="Getting Started"
              subtitle="Up and running in 4 simple steps"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {gettingStartedSteps.map((step) => (
                <motion.div
                  key={step.num}
                  whileHover={{ y: -3 }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 16,
                    padding: "20px 18px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(99,102,241,0.25))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      marginBottom: 12,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#a855f7",
                      background: "rgba(168,85,247,0.15)",
                      borderRadius: 20,
                      padding: "2px 8px",
                      display: "inline-block",
                      marginBottom: 8,
                    }}
                  >
                    Step {step.num}
                  </span>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#f0f0f5",
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </div>
                </motion.div>
              ))}
            </div>
            {/* OKX callout */}
            <div
              style={{
                padding: "16px 20px",
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.08))",
                border: "1px solid rgba(168,85,247,0.35)",
                borderRadius: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>⭐</span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#c4b5fd",
                    marginBottom: 4,
                  }}
                >
                  Recommended: Use OKX Wallet
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.6,
                  }}
                >
                  OKX Wallet offers the smoothest Arc Network experience.
                  Download at{" "}
                  <a
                    href="https://okx.com/web3"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#a855f7", textDecoration: "underline" }}
                  >
                    okx.com/web3
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Drawing */}
          <section
            ref={setRef("drawing")}
            id="drawing"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading
              icon="🎨"
              title="Drawing"
              subtitle="Create anything with professional tools"
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                "Click 'Start Drawing' from the home page",
                "Choose your canvas size (A4, Square, YouTube, Instagram, or Custom)",
                "Use the left toolbar to switch tools",
              ].map((step, i) => (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Quick Tools Reference
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {drawingTools.map((tool) => (
                <motion.div
                  key={tool.name}
                  whileHover={{
                    scale: 1.02,
                    borderColor: "rgba(168,85,247,0.4)",
                  }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "border-color 0.2s",
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>
                    {tool.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#f0f0f5",
                        marginBottom: 3,
                      }}
                    >
                      {tool.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      {tool.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <span style={{ fontSize: 18 }}>💾</span>
              <span>
                <strong style={{ color: "#34d399" }}>
                  Auto-save is enabled.
                </strong>{" "}
                Your work is preserved automatically.
              </span>
            </div>
          </section>

          {/* Section 3: Transactions */}
          <section
            ref={setRef("transactions")}
            id="transactions"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading
              icon="💳"
              title="Transactions"
              subtitle="Simple, transparent payment model"
            />
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0 16px",
                  padding: "10px 18px",
                  background:
                    "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                  color: "#c4b5fd",
                }}
              >
                <span>Action</span>
                <span style={{ textAlign: "right" as const }}>Payment</span>
              </div>
              {transactionRows.map((row, i) => (
                <div
                  key={row.action}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0 16px",
                    alignItems: "center",
                    padding: "13px 18px",
                    background:
                      i % 2 === 0
                        ? "rgba(255,255,255,0.025)"
                        : "rgba(255,255,255,0.015)",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}
                  >
                    {row.action}
                  </span>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: row.paid
                        ? "rgba(168,85,247,0.12)"
                        : "rgba(52,211,153,0.1)",
                      border: `1px solid ${row.paid ? "rgba(168,85,247,0.3)" : "rgba(52,211,153,0.25)"}`,
                      fontSize: 12,
                      fontWeight: 700,
                      color: row.paid ? "#c4b5fd" : "#34d399",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {row.paid ? "✅" : "❌"} {row.fee}
                  </span>
                </div>
              ))}
            </div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              style={{
                padding: "18px 20px",
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))",
                border: "1px solid rgba(168,85,247,0.4)",
                borderRadius: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
                boxShadow: "0 0 24px rgba(168,85,247,0.08)",
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>🔓</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#c4b5fd",
                    marginBottom: 4,
                  }}
                >
                  Once unlocked, drawing is FREE forever.
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.6,
                  }}
                >
                  You only pay for downloads and profile changes. No
                  subscription, no hidden fees.
                </div>
              </div>
            </motion.div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.7,
              }}
            >
              All transactions use Arc Testnet USDC. Need test tokens? Visit the{" "}
              <a
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#a855f7", textDecoration: "underline" }}
              >
                Arc Testnet faucet
              </a>
              . Transactions typically confirm in ~1 second on Arc Network.
            </div>
          </section>

          {/* Section 4: Best Experience */}
          <section
            ref={setRef("best-experience")}
            id="best-experience"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading
              icon="⚡"
              title="Best Experience"
              subtitle="Get the most out of Sketchora"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {bestExperienceTips.map((tip, i) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -2, borderColor: "rgba(168,85,247,0.35)" }}
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: "18px 20px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    alignItems: "flex-start",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.15))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {tip.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#f0f0f5",
                        marginBottom: 5,
                      }}
                    >
                      {tip.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.6,
                      }}
                    >
                      {tip.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Section 5: Troubleshooting */}
          <section
            ref={setRef("troubleshooting")}
            id="troubleshooting"
            style={{ marginBottom: 40 }}
          >
            <SectionHeading
              icon="🔧"
              title="Troubleshooting"
              subtitle="Quick fixes for common issues"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {troubleshootingItems.map((item, i) => (
                <TroubleshootCard key={item.title} item={item} index={i} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 56 }}>
              <button
                type="button"
                onClick={onGoHome}
                data-ocid="guide.back_home.button"
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  border: "none",
                  borderRadius: 50,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 28px rgba(168,85,247,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(168,85,247,0.4)";
                }}
              >
                ← Back to Home
              </button>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                © {new Date().getFullYear()} Sketchora · Built with ❤️ using{" "}
                <a
                  href="https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=sketchora"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "rgba(168,85,247,0.6)",
                    textDecoration: "none",
                  }}
                >
                  caffeine.ai
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .guide-sidebar { display: none !important; }
          .guide-hamburger { display: flex !important; }
          .guide-main { padding: 24px 20px 60px !important; }
        }
      `}</style>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            background: "linear-gradient(90deg, #f0f0f5, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </h2>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "rgba(255,255,255,0.07)",
            marginLeft: 8,
          }}
        />
      </div>
      {subtitle && (
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            margin: 0,
            paddingLeft: 2,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TroubleshootCard({
  item,
  index,
}: {
  item: { icon: string; title: string; desc: string };
  index: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      style={{
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${open ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-ocid={`guide.troubleshoot.item.${index + 1}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left" as const,
        }}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
        <span
          style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "#f0f0f5" }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontSize: 18,
            color: "rgba(168,85,247,0.7)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "12px 18px 16px 54px",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.7,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {item.desc}
        </div>
      )}
    </motion.div>
  );
}
