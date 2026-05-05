import { AnimatePresence, type Variants, motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";

interface CanvasDashboard {
  onStart: (width: number, height: number) => void;
}

interface Preset {
  id: string;
  icon: string;
  name: string;
  width: number;
  height: number;
  label: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: "a4p",
    icon: "📄",
    name: "A4 Portrait",
    width: 794,
    height: 1123,
    label: "Document",
    description: "794 × 1123",
  },
  {
    id: "a4l",
    icon: "📐",
    name: "A4 Landscape",
    width: 1123,
    height: 794,
    label: "Wide Doc",
    description: "1123 × 794",
  },
  {
    id: "ig-post",
    icon: "📱",
    name: "Instagram Post",
    width: 1080,
    height: 1080,
    label: "Social Square",
    description: "1080 × 1080",
  },
  {
    id: "ig-story",
    icon: "📸",
    name: "Instagram Story",
    width: 1080,
    height: 1920,
    label: "Story",
    description: "1080 × 1920",
  },
  {
    id: "youtube",
    icon: "🎬",
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    label: "Video",
    description: "1280 × 720",
  },
  {
    id: "wallpaper",
    icon: "🖥️",
    name: "HD Wallpaper",
    width: 1920,
    height: 1080,
    label: "Wallpaper",
    description: "1920 × 1080",
  },
  {
    id: "square",
    icon: "⬜",
    name: "Square",
    width: 800,
    height: 800,
    label: "Square",
    description: "800 × 800",
  },
  {
    id: "custom",
    icon: "✏️",
    name: "Custom Size",
    width: 0,
    height: 0,
    label: "Your Size",
    description: "Set dimensions",
  },
];

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(8px)",
  borderRadius: 16,
  padding: "18px 14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  position: "relative",
  overflow: "hidden",
};

const selectedCard: React.CSSProperties = {
  background: "rgba(168,85,247,0.12)",
  border: "1.5px solid rgba(168,85,247,0.55)",
  boxShadow:
    "0 0 22px rgba(168,85,247,0.28), inset 0 0 12px rgba(168,85,247,0.06)",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.15 },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.3 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.28 } },
};

// Floating particle for background decoration
function FloatingParticle({
  x,
  y,
  size,
  delay,
}: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          Math.random() > 0.5
            ? "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
      animate={{ y: [0, -30, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{
        duration: 4 + delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

const PARTICLES = [
  { x: 8, y: 15, size: 180, delay: 0 },
  { x: 88, y: 10, size: 220, delay: 1.2 },
  { x: 20, y: 75, size: 150, delay: 2.1 },
  { x: 75, y: 70, size: 200, delay: 0.7 },
  { x: 50, y: 40, size: 120, delay: 1.8 },
];

export default function CanvasDashboard({ onStart }: CanvasDashboard) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customW, setCustomW] = useState(1200);
  const [customH, setCustomH] = useState(800);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const selectedPreset = PRESETS.find((p) => p.id === selected);
  const isCustom = selected === "custom";

  const canStart = !!selected && (isCustom ? customW > 0 && customH > 0 : true);

  const finalW = isCustom ? customW : (selectedPreset?.width ?? 800);
  const finalH = isCustom ? customH : (selectedPreset?.height ?? 800);

  const handleStart = () => {
    if (!canStart) return;
    setIsStarting(true);
    setTimeout(() => {
      sessionStorage.setItem("sketchora-dashboard-shown", "1");
      onStart(finalW, finalH);
    }, 350);
  };

  // Keyboard: Enter to start if selection made
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canStart && !isStarting) handleStart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <AnimatePresence>
      {!isStarting && (
        <motion.div
          key="dashboard-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-ocid="canvas_dashboard.overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(8, 6, 18, 0.97)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            overflowY: "auto",
            padding: "0 16px 40px",
          }}
        >
          {/* Background particles */}
          {PARTICLES.map((p) => (
            <FloatingParticle key={`${p.x}-${p.y}`} {...p} />
          ))}

          {/* Subtle grid bg */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              textAlign: "center",
              marginTop: 52,
              marginBottom: 36,
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              style={{
                marginBottom: 18,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src="/assets/logo.png"
                alt="Sketchora"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  boxShadow:
                    "0 0 40px rgba(168,85,247,0.4), 0 8px 24px rgba(0,0,0,0.5)",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </motion.div>

            <div
              style={{
                display: "inline-block",
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(34,197,94,0.1) 100%)",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: 999,
                padding: "4px 14px",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(168,85,247,0.9)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              New Canvas
            </div>

            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 32px)",
                fontWeight: 800,
                color: "#f3f3f8",
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              What are you creating today?
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "rgba(180,170,210,0.7)",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Choose your canvas size to get started
            </p>
          </motion.div>

          {/* Preset grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: 720,
              position: "relative",
              zIndex: 2,
            }}
          >
            {PRESETS.map((preset) => {
              const isSelected = selected === preset.id;
              const isHovered = hoveredId === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  variants={cardVariants}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(preset.id)}
                  onMouseEnter={() => setHoveredId(preset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  data-ocid={`canvas_dashboard.preset.${preset.id}`}
                  style={{
                    ...glassCard,
                    ...(isSelected ? selectedCard : {}),
                    ...(isHovered && !isSelected
                      ? {
                          background: "rgba(255,255,255,0.07)",
                          borderColor: "rgba(255,255,255,0.15)",
                        }
                      : {}),
                    border: isSelected
                      ? selectedCard.border
                      : isHovered
                        ? "1px solid rgba(255,255,255,0.15)"
                        : (glassCard.border as string),
                  }}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #a855f7 0%, #22c55e 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                      }}
                    >
                      ✓
                    </motion.div>
                  )}

                  <span
                    style={{ fontSize: 28, lineHeight: 1, marginBottom: 2 }}
                  >
                    {preset.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isSelected ? "#e8d8ff" : "#c8c0d8",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {preset.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: isSelected
                        ? "rgba(168,85,247,0.9)"
                        : "rgba(150,140,175,0.7)",
                      fontFamily: "monospace",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {preset.description}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: isSelected
                        ? "rgba(34,197,94,0.9)"
                        : "rgba(120,120,150,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginTop: 2,
                    }}
                  >
                    {preset.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Custom size inputs */}
          <AnimatePresence>
            {isCustom && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                style={{
                  width: "100%",
                  maxWidth: 720,
                  position: "relative",
                  zIndex: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "rgba(168,85,247,0.07)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    display: "flex",
                    gap: 24,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#c8b8e8" }}
                  >
                    Custom Dimensions
                  </span>
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <label
                        htmlFor="custom-width"
                        style={{
                          fontSize: 10,
                          color: "rgba(168,85,247,0.7)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Width (px)
                      </label>
                      <input
                        id="custom-width"
                        type="number"
                        min={100}
                        max={8000}
                        value={customW}
                        onChange={(e) =>
                          setCustomW(Math.max(100, Number(e.target.value)))
                        }
                        data-ocid="canvas_dashboard.custom_width.input"
                        style={{
                          width: 100,
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(168,85,247,0.3)",
                          background: "rgba(168,85,247,0.08)",
                          color: "#e8d8ff",
                          fontSize: 14,
                          fontWeight: 700,
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 18,
                        color: "rgba(168,85,247,0.5)",
                        marginTop: 18,
                      }}
                    >
                      ×
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <label
                        htmlFor="custom-height"
                        style={{
                          fontSize: 10,
                          color: "rgba(168,85,247,0.7)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Height (px)
                      </label>
                      <input
                        id="custom-height"
                        type="number"
                        min={100}
                        max={8000}
                        value={customH}
                        onChange={(e) =>
                          setCustomH(Math.max(100, Number(e.target.value)))
                        }
                        data-ocid="canvas_dashboard.custom_height.input"
                        style={{
                          width: 100,
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(168,85,247,0.3)",
                          background: "rgba(168,85,247,0.08)",
                          color: "#e8d8ff",
                          fontSize: 14,
                          fontWeight: 700,
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{ fontSize: 11, color: "rgba(150,140,175,0.6)" }}
                  >
                    Total: {((customW * customH) / 1_000_000).toFixed(1)} MP
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start Drawing button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{ marginTop: 32, position: "relative", zIndex: 2 }}
          >
            <motion.button
              type="button"
              whileHover={canStart ? { scale: 1.04, y: -2 } : undefined}
              whileTap={canStart ? { scale: 0.97 } : undefined}
              onClick={handleStart}
              disabled={!canStart}
              data-ocid="canvas_dashboard.start_drawing.button"
              style={{
                padding: "15px 48px",
                borderRadius: 999,
                border: canStart
                  ? "1px solid rgba(168,85,247,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: canStart
                  ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22c55e 140%)"
                  : "rgba(255,255,255,0.05)",
                color: canStart ? "#fff" : "rgba(180,170,200,0.4)",
                fontSize: 15,
                fontWeight: 700,
                cursor: canStart ? "pointer" : "not-allowed",
                letterSpacing: "0.02em",
                boxShadow: canStart
                  ? "0 0 32px rgba(168,85,247,0.35), 0 4px 16px rgba(0,0,0,0.4)"
                  : "none",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
                minWidth: 220,
              }}
            >
              {canStart ? "✨ Start Drawing" : "Select a Canvas Size"}
            </motion.button>

            {canStart && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "rgba(150,140,175,0.55)",
                  marginTop: 10,
                }}
              >
                {finalW} × {finalH} px · Press Enter to start
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
