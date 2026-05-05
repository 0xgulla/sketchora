import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface CanvasConfig {
  width: number;
  height: number;
  background: "white" | "transparent" | string;
}

export interface NewCanvasModalProps {
  isOpen: boolean;
  onConfirm: (config: CanvasConfig) => void;
  onClose: () => void;
}

const PRESETS = [
  {
    id: "a4",
    name: "A4",
    width: 2480,
    height: 3508,
    icon: (
      <svg
        width="18"
        height="26"
        viewBox="0 0 18 26"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="16"
          height="24"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M4 8h10M4 12h10M4 16h7"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
    dims: "2480 × 3508",
  },
  {
    id: "square",
    name: "Square",
    width: 1080,
    height: 1080,
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    ),
    dims: "1080 × 1080",
  },
  {
    id: "widescreen",
    name: "16:9",
    width: 1920,
    height: 1080,
    icon: (
      <svg
        width="32"
        height="18"
        viewBox="0 0 32 18"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    ),
    dims: "1920 × 1080",
  },
  {
    id: "custom",
    name: "Custom",
    width: 0,
    height: 0,
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M13 4v18M4 13h18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="13"
          cy="13"
          r="3"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M5 5l4 4M17 17l4 4M5 21l4-4M17 9l4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    dims: "Your size",
  },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

const LS_KEY = "sketchora-last-canvas";

function loadLastCanvas(): {
  width: number;
  height: number;
  background: string;
} | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLastCanvas(config: CanvasConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

const KEYFRAMES = `
  @keyframes ncm-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ncm-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes ncm-panel-in  { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes ncm-panel-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.92); } }
  @keyframes ncm-loader-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ncm-spin { to { transform: rotate(360deg); } }
  @keyframes ncm-pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.7), 0 0 0 0 rgba(103,232,249,0.4); }
    70%  { box-shadow: 0 0 0 20px rgba(139,92,246,0), 0 0 0 40px rgba(103,232,249,0); }
    100% { box-shadow: 0 0 0 0 rgba(139,92,246,0), 0 0 0 0 rgba(103,232,249,0); }
  }
  @keyframes ncm-logo-pulse {
    0%, 100% { opacity: 0.9; text-shadow: 0 0 20px rgba(139,92,246,0.8); }
    50%       { opacity: 1;   text-shadow: 0 0 40px rgba(139,92,246,1), 0 0 60px rgba(103,232,249,0.5); }
  }
  .ncm-backdrop  { animation: ncm-backdrop-in  0.25s ease-out both; }
  .ncm-backdrop.closing { animation: ncm-backdrop-out 0.2s ease-in both; }
  .ncm-panel     { animation: ncm-panel-in  0.25s cubic-bezier(0.22,1,0.36,1) both; }
  .ncm-panel.closing    { animation: ncm-panel-out 0.2s ease-in both; }
  .ncm-loader-overlay   { animation: ncm-loader-in 0.2s ease-out both; }
  .ncm-spinner   { animation: ncm-spin 0.9s linear infinite; }
  .ncm-glow-ring { animation: ncm-pulse-ring 1.8s ease-out infinite; }
  .ncm-logo-text { animation: ncm-logo-pulse 1.8s ease-in-out infinite; }
  .ncm-preset-card { transition: all 0.18s ease; }
  .ncm-preset-card:hover {
    background: rgba(255,255,255,0.08) !important;
    border-color: rgba(139,92,246,0.4) !important;
    transform: scale(1.03);
  }
  .ncm-input:focus {
    border-color: rgba(139,92,246,0.7) !important;
    box-shadow: 0 0 0 2px rgba(139,92,246,0.18);
    outline: none;
  }
  .ncm-select:focus { outline: none; border-color: rgba(139,92,246,0.7); }
`;

export default function NewCanvasModal({
  isOpen,
  onConfirm,
  onClose,
}: NewCanvasModalProps) {
  const [closing, setClosing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("square");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState<"px" | "in">("px");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const [background, setBackground] = useState<
    "white" | "transparent" | string
  >("white");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [bgChoice, setBgChoice] = useState<"white" | "transparent" | "custom">(
    "white",
  );
  const [validationError, setValidationError] = useState("");
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // On open: restore last canvas size or defaults
  useEffect(() => {
    if (!isOpen) return;
    const last = loadLastCanvas();
    if (last) {
      const matchedPreset = PRESETS.find(
        (p) =>
          p.id !== "custom" &&
          p.width === last.width &&
          p.height === last.height,
      );
      if (matchedPreset) {
        setSelectedPreset(matchedPreset.id);
        setWidth(matchedPreset.width);
        setHeight(matchedPreset.height);
      } else {
        setSelectedPreset("custom");
        setWidth(last.width || 1080);
        setHeight(last.height || 1080);
      }
      const bg = last.background ?? "white";
      if (bg === "white" || bg === "transparent") {
        setBgChoice(bg);
        setBackground(bg);
      } else {
        setBgChoice("custom");
        setCustomColor(bg);
        setBackground(bg);
      }
    } else {
      setSelectedPreset("square");
      setWidth(1080);
      setHeight(1080);
      setBgChoice("white");
      setBackground("white");
    }
    setValidationError("");
    setClosing(false);
    setShowLoader(false);
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  const selectPreset = (id: PresetId) => {
    setSelectedPreset(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset || id === "custom") return;
    setWidth(preset.width);
    setHeight(preset.height);
    setOrientation(preset.width > preset.height ? "landscape" : "portrait");
    setValidationError("");
  };

  const toDisplay = (px: number) =>
    unit === "in" ? +(px / 96).toFixed(2) : px;
  const toPx = (val: number) =>
    unit === "in" ? Math.round(val * 96) : Math.round(val);

  const handleWidthChange = (val: string) => {
    const n = Number.parseFloat(val);
    if (!Number.isNaN(n) && n > 0) setWidth(toPx(n));
    setSelectedPreset("custom");
  };

  const handleHeightChange = (val: string) => {
    const n = Number.parseFloat(val);
    if (!Number.isNaN(n) && n > 0) setHeight(toPx(n));
    setSelectedPreset("custom");
  };

  const handleOrientationToggle = (ori: "portrait" | "landscape") => {
    if (ori === orientation) return;
    setOrientation(ori);
    setWidth(height);
    setHeight(width);
  };

  const handleBgChoice = (choice: "white" | "transparent" | "custom") => {
    setBgChoice(choice);
    if (choice === "white") setBackground("white");
    else if (choice === "transparent") setBackground("transparent");
    else {
      setBackground(customColor);
      setTimeout(() => colorPickerRef.current?.click(), 10);
    }
  };

  const handleCreate = () => {
    if (!width || !height || width < 1 || height < 1) {
      setValidationError("Please enter valid dimensions (minimum 1×1)");
      return;
    }
    const config: CanvasConfig = { width, height, background };
    saveLastCanvas(config);
    setShowLoader(true);
    // 500ms loading delay, then navigate
    setTimeout(() => {
      onConfirm(config);
    }, 500);
  };

  // Not open — render nothing (but always mounted in DOM by parent)
  if (!isOpen && !closing && !showLoader) return null;

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#e8d8ff",
    padding: "9px 12px",
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: 600,
    width: "100%",
    boxSizing: "border-box",
  };

  const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

  return createPortal(
    <>
      <style>{KEYFRAMES}</style>

      {/* Full-screen loading overlay */}
      {showLoader && (
        <div
          className="ncm-loader-overlay"
          data-ocid="new_canvas_modal.loading_state"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 10000,
            background: "rgba(13,10,26,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            fontFamily: FONT,
          }}
        >
          <div style={{ position: "relative", width: 88, height: 88 }}>
            <div
              className="ncm-glow-ring"
              style={{ position: "absolute", inset: 0, borderRadius: "50%" }}
            />
            <div
              className="ncm-spinner"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "#a855f7",
                borderRightColor: "rgba(103,232,249,0.6)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: "50%",
                border: "1px solid rgba(139,92,246,0.25)",
                background:
                  "radial-gradient(circle at center, rgba(139,92,246,0.12), rgba(13,10,26,0.8))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="ncm-logo-text"
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  background: "linear-gradient(135deg,#c4b5fd,#67e8f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                S
              </span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#e8d8ff",
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              Preparing your canvas…
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(196,181,253,0.55)",
                fontWeight: 500,
              }}
            >
              {width} × {height} px
            </p>
          </div>
        </div>
      )}

      {/* Modal overlay — position:fixed, perfectly centered */}
      {!showLoader && (
        <div
          role="presentation"
          data-ocid="new_canvas_modal.backdrop"
          className={`ncm-backdrop${closing ? " closing" : ""}`}
          onClick={triggerClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") triggerClose();
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 9999,
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          {/* Modal panel */}
          <div
            aria-modal="true"
            aria-labelledby="ncm-title"
            data-ocid="new_canvas_modal.dialog"
            className={`ncm-panel${closing ? " closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") triggerClose();
              e.stopPropagation();
            }}
            style={{
              background: "rgba(20,20,30,0.9)",
              borderRadius: 16,
              padding: 24,
              width: 400,
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow:
                "0 0 0 1px rgba(139,92,246,0.4), 0 25px 60px rgba(0,0,0,0.65), 0 0 40px rgba(139,92,246,0.12)",
              fontFamily: FONT,
              color: "#f0eaff",
              willChange: "transform, opacity",
              boxSizing: "border-box",
            }}
          >
            {/* Title */}
            <h2
              id="ncm-title"
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                background: "linear-gradient(135deg,#c4b5fd,#67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: "0 0 18px 0",
              }}
            >
              Customize Canvas
            </h2>

            {/* Preset grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className="ncm-preset-card"
                    data-ocid={`new_canvas_modal.preset.${preset.id}`}
                    onClick={() => selectPreset(preset.id)}
                    style={{
                      background: isSelected
                        ? "rgba(139,92,246,0.14)"
                        : "rgba(255,255,255,0.04)",
                      border: isSelected
                        ? "2px solid rgba(139,92,246,0.8)"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "12px 8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                      boxShadow: isSelected
                        ? "0 0 16px rgba(139,92,246,0.3), inset 0 0 12px rgba(139,92,246,0.06)"
                        : "none",
                      color: isSelected ? "#c4b5fd" : "rgba(240,234,255,0.6)",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ opacity: isSelected ? 1 : 0.65 }}>
                      {preset.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isSelected ? "#e8d8ff" : "rgba(240,234,255,0.7)",
                      }}
                    >
                      {preset.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: isSelected
                          ? "rgba(139,92,246,0.9)"
                          : "rgba(170,160,200,0.55)",
                      }}
                    >
                      {preset.dims}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Width / Height / Unit */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                marginBottom: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="ncm-width"
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(196,181,253,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Width
                </label>
                <input
                  id="ncm-width"
                  type="number"
                  min={1}
                  max={10000}
                  value={toDisplay(width)}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="ncm-input"
                  data-ocid="new_canvas_modal.width.input"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="ncm-height"
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(196,181,253,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Height
                </label>
                <input
                  id="ncm-height"
                  type="number"
                  min={1}
                  max={10000}
                  value={toDisplay(height)}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="ncm-input"
                  data-ocid="new_canvas_modal.height.input"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="ncm-unit"
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(196,181,253,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Unit
                </label>
                <select
                  id="ncm-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "px" | "in")}
                  className="ncm-select"
                  data-ocid="new_canvas_modal.unit.select"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#e8d8ff",
                    padding: "9px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="px">px</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            {validationError && (
              <p
                data-ocid="new_canvas_modal.validation.error_state"
                style={{
                  color: "#f87171",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 10,
                  marginTop: -4,
                }}
              >
                {validationError}
              </p>
            )}

            {/* Orientation */}
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(196,181,253,0.7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Orientation
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["portrait", "landscape"] as const).map((ori) => {
                  const isActive = orientation === ori;
                  return (
                    <button
                      key={ori}
                      type="button"
                      data-ocid={`new_canvas_modal.orientation.${ori}`}
                      onClick={() => handleOrientationToggle(ori)}
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: isActive
                          ? "1px solid rgba(139,92,246,0.7)"
                          : "1px solid rgba(255,255,255,0.1)",
                        background: isActive
                          ? "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(103,232,249,0.15))"
                          : "rgba(255,255,255,0.03)",
                        color: isActive ? "#c4b5fd" : "rgba(240,234,255,0.45)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.18s",
                        fontFamily: "inherit",
                        boxShadow: isActive
                          ? "0 0 12px rgba(139,92,246,0.25)"
                          : "none",
                      }}
                    >
                      {ori.charAt(0).toUpperCase() + ori.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Background */}
            <div style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(196,181,253,0.7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Background
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["white", "transparent", "custom"] as const).map((choice) => {
                  const isActive = bgChoice === choice;
                  const swatch =
                    choice === "white" ? (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          background: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      />
                    ) : choice === "transparent" ? (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          backgroundImage:
                            "linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)",
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                          backgroundColor: "#222",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          background: customColor,
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      />
                    );

                  return (
                    <button
                      key={choice}
                      type="button"
                      data-ocid={`new_canvas_modal.bg.${choice}`}
                      onClick={() => handleBgChoice(choice)}
                      style={{
                        flex: 1,
                        padding: "8px 6px",
                        borderRadius: 8,
                        border: isActive
                          ? "2px solid rgba(139,92,246,0.8)"
                          : "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.18s",
                        boxShadow: isActive
                          ? "0 0 12px rgba(139,92,246,0.25)"
                          : "none",
                        fontFamily: "inherit",
                      }}
                    >
                      {swatch}
                      <span
                        style={{
                          fontSize: 11,
                          color: isActive
                            ? "#c4b5fd"
                            : "rgba(240,234,255,0.45)",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {choice}
                      </span>
                    </button>
                  );
                })}

                {/* Hidden native color picker */}
                <input
                  ref={colorPickerRef}
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setBackground(e.target.value);
                    setBgChoice("custom");
                  }}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                    width: 0,
                    height: 0,
                  }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                data-ocid="new_canvas_modal.cancel_button"
                onClick={triggerClose}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "transparent",
                  color: "rgba(240,234,255,0.65)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.18s, border-color 0.18s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="new_canvas_modal.create_button"
                onClick={handleCreate}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "1px solid rgba(139,92,246,0.5)",
                  background: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(139,92,246,0.45)",
                  transition: "transform 0.18s, box-shadow 0.18s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow =
                    "0 0 32px rgba(139,92,246,0.65)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(139,92,246,0.45)";
                }}
              >
                Create Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
