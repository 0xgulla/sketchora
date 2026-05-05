import { useEffect, useRef, useState } from "react";

interface AppLoadingScreenProps {
  onComplete: () => void;
}

const TAGLINE = "Create. Draw. Design.";
const APP_NAME = "Sketchora";

export default function AppLoadingScreen({
  onComplete,
}: AppLoadingScreenProps) {
  const [phase, setPhase] = useState<
    "enter" | "logo" | "text" | "tagline" | "progress" | "exit"
  >("enter");
  const [progress, setProgress] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  /* ── Particle canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
    };

    const colors = [
      "rgba(168,85,247,", // purple
      "rgba(139,92,246,", // violet
      "rgba(34,197,94,", // green
      "rgba(16,185,129,", // emerald
      "rgba(99,102,241,", // indigo
      "rgba(6,182,212,", // cyan
    ];

    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 3 + 0.5,
      alpha: Math.random() * 0.75 + 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: Math.random() * 120,
      maxLife: 120 + Math.random() * 80,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0;
        }
        // Wrap edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const fade = Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${(p.alpha * fade).toFixed(2)})`;
        ctx.fill();
      }

      // Glowing connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = (1 - dist / 100) * 0.1;
            ctx.strokeStyle = `rgba(168,85,247,${opacity.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /* ── Animation sequence ── */
  useEffect(() => {
    // Phase: enter (0–400ms) → dark bg visible
    const t1 = setTimeout(() => setPhase("logo"), 400);

    // Phase: logo (400–1200ms) → logo fades in
    const t2 = setTimeout(() => setPhase("text"), 1200);

    // Phase: text reveal — type each char
    let charTimer: ReturnType<typeof setTimeout>;
    const startTyping = () => {
      let i = 0;
      const typeNext = () => {
        if (i <= APP_NAME.length) {
          setVisibleChars(i);
          i++;
          charTimer = setTimeout(typeNext, 65);
        }
      };
      typeNext();
    };

    const t3 = setTimeout(startTyping, 1200);

    // Phase: tagline
    const t4 = setTimeout(() => {
      setPhase("tagline");
      setTaglineVisible(true);
    }, 1900);

    // Phase: progress bar
    const t5 = setTimeout(() => {
      setPhase("progress");
      setProgress(0);
      let pv = 0;
      const step = () => {
        pv += 2.5;
        setProgress(Math.min(pv, 100));
        if (pv < 100) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }, 2100);

    // Phase: exit
    const t6 = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 650);
    }, 2750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(charTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#07060f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transition: exiting
          ? "transform 0.65s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease"
          : "none",
        opacity: exiting ? 0 : 1,
        overflow: "hidden",
      }}
    >
      {/* Multi-layer background glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(88,28,220,0.2) 0%, rgba(22,8,60,0.12) 55%, transparent 100%)",
          pointerEvents: "none",
          animation: "bgPulse 4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          animation: "bgPulse 3s ease-in-out infinite",
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.9,
        }}
      />

      {/* ── Orbiting ring around logo ── */}
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: "1px solid rgba(168,85,247,0.25)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) translateY(-90px)",
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.6s ease",
          animation: "spinOrbit 6s linear infinite",
          pointerEvents: "none",
        }}
      >
        {/* Orbit dot */}
        <div
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(168,85,247,0.9)",
            boxShadow: "0 0 12px 4px rgba(168,85,247,0.6)",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: phase === "enter" ? 0 : 1,
            transform:
              phase === "enter"
                ? "scale(0.6) translateY(20px)"
                : "scale(1) translateY(0)",
            transition:
              "opacity 0.8s cubic-bezier(0.34,1.56,0.64,1), transform 0.8s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Glow ring behind logo */}
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <div
              style={{
                position: "absolute",
                inset: -16,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(34,197,94,0.18) 60%, transparent 100%)",
                animation: "pulse-ring 2s ease-in-out infinite",
              }}
            />
            {/* Second, slower ring */}
            <div
              style={{
                position: "absolute",
                inset: -28,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
                animation: "pulse-ring 2.8s 0.4s ease-in-out infinite",
              }}
            />
            <img
              src="/assets/logo.png"
              alt="Sketchora"
              style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                objectFit: "cover",
                boxShadow:
                  "0 0 40px rgba(168,85,247,0.6), 0 0 12px rgba(34,197,94,0.35), 0 12px 40px rgba(0,0,0,0.75)",
                position: "relative",
                zIndex: 1,
                animation: "logoFloat 3s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* App name — typewriter reveal */}
        <div
          style={{
            opacity: phase === "enter" || phase === "logo" ? 0 : 1,
            transform:
              phase === "enter" || phase === "logo"
                ? "translateY(16px)"
                : "translateY(0)",
            transition: "opacity 0.45s ease, transform 0.45s ease",
            height: 56,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background:
                "linear-gradient(135deg, #a855f7 0%, #c084fc 40%, #22c55e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              filter: "drop-shadow(0 0 22px rgba(168,85,247,0.6))",
              whiteSpace: "nowrap",
            }}
          >
            {APP_NAME.slice(0, visibleChars)}
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: "0.85em",
                background: "linear-gradient(180deg, #a855f7, #22c55e)",
                marginLeft: 2,
                verticalAlign: "middle",
                opacity: visibleChars < APP_NAME.length ? 1 : 0,
                transition: "opacity 0.2s",
                borderRadius: 2,
                animation: "blink-cursor 0.7s step-end infinite",
                boxShadow: "0 0 8px rgba(168,85,247,0.8)",
              }}
            />
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(196,160,230,0.85)",
            margin: 0,
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s",
          }}
        >
          {TAGLINE}
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: 240,
            marginTop: 8,
            opacity: phase === "progress" || phase === "exit" ? 1 : 0,
            transform:
              phase === "progress" || phase === "exit"
                ? "translateY(0)"
                : "translateY(6px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          {/* Label */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 10,
              color: "rgba(196,160,230,0.5)",
              letterSpacing: "0.08em",
            }}
          >
            <span>Loading workspace...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          {/* Track */}
          <div
            style={{
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.07)",
              overflow: "visible",
              position: "relative",
            }}
          >
            {/* Fill */}
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #7c3aed, #a855f7 50%, #22c55e)",
                transition: "width 0.05s linear",
                position: "relative",
                boxShadow: "0 0 8px rgba(168,85,247,0.5)",
              }}
            >
              {/* Glowing tip */}
              {progress > 0 && progress < 100 && (
                <div
                  style={{
                    position: "absolute",
                    right: -5,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#c084fc",
                    boxShadow:
                      "0 0 10px 4px rgba(192,132,252,0.85), 0 0 3px rgba(255,255,255,0.9)",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spinOrbit {
          from { transform: translate(-50%, -50%) translateY(-90px) rotate(0deg) translateY(90px); }
          to { transform: translate(-50%, -50%) translateY(-90px) rotate(360deg) translateY(90px); }
        }
      `}</style>
    </div>
  );
}
