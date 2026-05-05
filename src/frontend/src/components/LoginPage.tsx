import { useEffect, useRef } from "react";
import Web3LoginPanel from "./Web3LoginPanel";

export default function LoginPage() {
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // Particle background animation
  useEffect(() => {
    const canvas = particlesRef.current;
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

    const colors = ["139,92,246", "96,165,250", "6,182,212", "167,139,250"];
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    type Particle = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      va: number;
      color: string;
    };
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random(),
      va: (Math.random() - 0.5) * 0.008,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const tick = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a = Math.max(0.05, Math.min(0.8, p.a + p.va));
        if (p.a <= 0.05 || p.a >= 0.8) p.va *= -1;
        if (p.x < 0) p.x = W();
        if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H();
        if (p.y > H()) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.a})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#040614",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={particlesRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Radial gradient overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(139,92,246,0.2) 0%,transparent 70%), radial-gradient(ellipse 50% 50% at 75% 80%, rgba(6,182,212,0.15) 0%,transparent 65%)",
        }}
      />

      {/* Login card */}
      <div
        data-ocid="login.modal"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 24,
          padding: "40px 40px 36px",
          maxWidth: 480,
          width: "100%",
          position: "relative",
          zIndex: 1,
          boxShadow:
            "0 48px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
          animation: "loginFadeIn 0.6s ease-out both",
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              margin: "0 auto 14px",
              overflow: "hidden",
              boxShadow:
                "0 0 28px rgba(124,58,237,0.5), 0 0 50px rgba(16,185,129,0.15)",
              border: "2px solid rgba(124,58,237,0.4)",
            }}
          >
            <img
              src="/assets/generated/sketchora-logo-transparent.dim_200x200.png"
              alt="Sketchora"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 4,
              background:
                "linear-gradient(135deg,#f0eaff 0%,#c4b5fd 40%,#6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Sketchora
          </h1>
          <p style={{ color: "rgba(240,234,255,0.5)", fontSize: 13 }}>
            Connect your wallet to enter your workspace
          </p>
        </div>

        {/* Web3 wallet login — sole auth method */}
        <div
          data-ocid="login.web3_panel"
          style={{ animation: "loginFadeIn 0.25s ease-out" }}
        >
          <Web3LoginPanel />
        </div>
      </div>

      <style>{`
        @keyframes loginFadeIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
