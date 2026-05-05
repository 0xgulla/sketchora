import { useCallback, useEffect, useRef, useState } from "react";

interface AIAssistantPanelProps {
  onColorSelect: (color: string) => void;
  onAddColorToHistory: (color: string) => void;
  onInsertImageLayer: (imageUrl: string) => void;
  onClose: () => void;
  accentColor?: string;
}

interface ColorSwatch {
  hex: string;
  label: string;
}

// ─── Deterministic color generation from prompt ──────────────────────────────

const KEYWORD_PALETTES: Record<string, string[]> = {
  sunset: ["#FF6B35", "#F7931E", "#FFD23F", "#FF4E6A", "#C24B8A"],
  sunrise: ["#FF9A3C", "#FFD166", "#FF6B6B", "#FFC8A2", "#E07B39"],
  ocean: ["#006994", "#0099CC", "#33BBFF", "#7DD3FC", "#BAE6FD"],
  sea: ["#1B6CA8", "#2196F3", "#64B5F6", "#A5D8FF", "#E0F2FE"],
  forest: ["#2D6A4F", "#40916C", "#74C69D", "#B7E4C7", "#1B4332"],
  nature: ["#52B788", "#2D6A4F", "#95D5B2", "#D8F3DC", "#74C69D"],
  cyberpunk: ["#FF00FF", "#00FFFF", "#FF2D55", "#7B2FFF", "#00FF85"],
  neon: ["#FF0090", "#00FFCC", "#FF6600", "#8800FF", "#00BBFF"],
  galaxy: ["#0B0D2B", "#1A237E", "#7C4DFF", "#AA00FF", "#FF4081"],
  space: ["#0A0A1A", "#1E3A5F", "#4A90D9", "#7B68EE", "#C39BD3"],
  fire: ["#FF1C00", "#FF6600", "#FF9900", "#FFCC00", "#FF3300"],
  lava: ["#8B0000", "#CC2200", "#FF4500", "#FF7700", "#FFAA00"],
  ice: ["#E0F7FA", "#B2EBF2", "#80DEEA", "#4DD0E1", "#26C6DA"],
  snow: ["#F0F8FF", "#E8F4FD", "#BDD7EE", "#9EC5E8", "#6DACD5"],
  autumn: ["#A0522D", "#C1440E", "#D2691E", "#CD853F", "#F4A460"],
  fall: ["#8B4513", "#D2691E", "#FF8C00", "#FF4500", "#DC143C"],
  spring: ["#FFB7C5", "#FFD1DC", "#C8E6C9", "#B2DFDB", "#F3E5F5"],
  pastel: ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF"],
  vintage: ["#8B7355", "#CD853F", "#D2B48C", "#BC8F8F", "#F4A460"],
  retro: ["#FF6B35", "#F7C59F", "#EFEFD0", "#004E89", "#1A936F"],
  minimal: ["#F5F5F5", "#E0E0E0", "#BDBDBD", "#757575", "#424242"],
  monochrome: ["#1A1A1A", "#3D3D3D", "#707070", "#A8A8A8", "#E0E0E0"],
  pink: ["#FF69B4", "#FF1493", "#FFB6C1", "#DB7093", "#FF85B3"],
  rose: ["#FF4D6D", "#FF758F", "#FF8FA3", "#FFB3C1", "#FFCCD5"],
  purple: ["#6A0DAD", "#9B30FF", "#BF7FFF", "#D4A8FF", "#7B2FFF"],
  violet: ["#8A2BE2", "#9932CC", "#BA55D3", "#DA70D6", "#EE82EE"],
  earth: ["#795548", "#8D6E63", "#A1887F", "#BCAAA4", "#D7CCC8"],
  warm: ["#FF6B35", "#F7931E", "#FFD23F", "#FF4E6A", "#FFA07A"],
  cool: ["#4FC3F7", "#29B6F6", "#0288D1", "#01579B", "#7986CB"],
  dark: ["#1A1A2E", "#16213E", "#0F3460", "#533483", "#E94560"],
  midnight: ["#0D0221", "#1A0537", "#2D1B69", "#543B8B", "#7B68EE"],
  gold: ["#FFD700", "#FFC200", "#FFAA00", "#FF8C00", "#B8860B"],
  luxury: ["#8B7355", "#CD853F", "#D4AF37", "#B8860B", "#DAA520"],
  tropical: ["#00B894", "#00CEC9", "#FDCB6E", "#E17055", "#A29BFE"],
  beach: ["#F9CA24", "#F0932B", "#6AB04C", "#22A6B3", "#BADC58"],
  desert: ["#D4A574", "#C8956C", "#B07D5E", "#967B68", "#E8CDA0"],
  sand: ["#C2B280", "#DAC17C", "#E8C99A", "#F0D9B5", "#F5E6C8"],
};

function hexToHsl(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePaletteFromPrompt(prompt: string): ColorSwatch[] {
  const lower = prompt.toLowerCase();

  // Check keyword matches
  for (const [kw, colors] of Object.entries(KEYWORD_PALETTES)) {
    if (lower.includes(kw)) {
      return colors.map((hex, i) => ({
        hex,
        label:
          ["Primary", "Secondary", "Accent 1", "Accent 2", "Accent 3"][i] ??
          `Color ${i + 1}`,
      }));
    }
  }

  // Fallback: hash-based generation
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash * 31 + prompt.charCodeAt(i)) >>> 0;
  }

  const baseHue = hash % 360;
  const labels = [
    "Primary",
    "Secondary",
    "Accent 1",
    "Accent 2",
    "Dark",
    "Light",
    "Contrast",
  ];
  const offsets = [0, 30, 60, 180, -30, 15, 120];
  const sats = [70, 60, 65, 55, 50, 40, 75];
  const lts = [50, 55, 45, 60, 25, 80, 50];

  return offsets.slice(0, 7).map((offset, i) => ({
    hex: hslToHex((baseHue + offset + 360) % 360, sats[i], lts[i]),
    label: labels[i],
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAssistantPanel({
  onColorSelect,
  onAddColorToHistory,
  onInsertImageLayer,
  onClose,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<"palette" | "image">("palette");
  const [pos, setPos] = useState({
    x: window.innerWidth - 380,
    y: window.innerHeight - 580,
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Palette tab state ──────────────────────────────────────────────────────
  const [palettePrompt, setPalettePrompt] = useState("");
  const [palette, setPalette] = useState<ColorSwatch[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState<number | null>(
    null,
  );

  // ── Image tab state ────────────────────────────────────────────────────────
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      setDragging(true);
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const nx = Math.max(
        0,
        Math.min(window.innerWidth - 340, e.clientX - dragOffset.current.x),
      );
      const ny = Math.max(
        0,
        Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y),
      );
      setPos({ x: nx, y: ny });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // ── Palette generation ────────────────────────────────────────────────────
  const handleGeneratePalette = useCallback(async () => {
    if (!palettePrompt.trim()) return;
    setPaletteLoading(true);
    setSelectedSwatchIndex(null);

    // Show 800ms of fake loading for UX, then generate
    await new Promise((r) => setTimeout(r, 800));

    const generated = generatePaletteFromPrompt(palettePrompt.trim());
    setPalette(generated);
    // Auto-add all colors to history
    for (const swatch of generated) {
      onAddColorToHistory(swatch.hex);
    }
    setPaletteLoading(false);
  }, [palettePrompt, onAddColorToHistory]);

  const handleSwatchClick = useCallback(
    (swatch: ColorSwatch, index: number) => {
      setSelectedSwatchIndex(index);
      onColorSelect(swatch.hex);
      onAddColorToHistory(swatch.hex);
    },
    [onColorSelect, onAddColorToHistory],
  );

  // ── Image generation ──────────────────────────────────────────────────────
  const handleGenerateImage = useCallback(() => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);

    const encoded = encodeURIComponent(imagePrompt.trim());
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Date.now()}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageUrl(url);
      setImageLoading(false);
    };
    img.onerror = () => {
      setImageError("Image generation failed. Please try a different prompt.");
      setImageLoading(false);
    };
    img.src = url;
  }, [imagePrompt]);

  const handleInsertImage = useCallback(() => {
    if (!imageUrl) return;
    onInsertImageLayer(imageUrl);
  }, [imageUrl, onInsertImageLayer]);

  // ── Keyboard shortcut: Alt+A closes panel ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const aiGold = "oklch(0.75 0.18 65)";
  const aiGoldBg = "oklch(0.75 0.18 65 / 0.15)";
  const aiGoldBorder = "oklch(0.75 0.18 65 / 0.35)";

  return (
    <div
      data-ocid="ai_panel.dialog"
      className="ai-panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 340,
        zIndex: 1000,
        userSelect: dragging ? "none" : undefined,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 8px",
          cursor: "grab",
          borderBottom: "1px solid oklch(0.22 0.005 240 / 0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: aiGoldBg,
              border: `1px solid ${aiGoldBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ✨
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "oklch(0.92 0.005 240)",
              letterSpacing: "0.01em",
            }}
          >
            AI Assistant
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-ocid="ai_panel.close_button"
          aria-label="Close AI panel"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "oklch(0.2 0.005 240 / 0.8)",
            color: "oklch(0.6 0.005 240)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.25 0.005 240)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.9 0.005 240)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.2 0.005 240 / 0.8)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.6 0.005 240)";
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          padding: "8px 12px 0",
          gap: 4,
        }}
      >
        {(["palette", "image"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "palette" ? "🎨 Color Palette" : "🖼️ Image Gen";
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              data-ocid={`ai_panel.${tab}.tab`}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 8,
                border: isActive
                  ? `1px solid ${aiGoldBorder}`
                  : "1px solid transparent",
                background: isActive ? aiGoldBg : "transparent",
                color: isActive ? aiGold : "oklch(0.55 0.005 240)",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                outline: "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div style={{ padding: "12px", flex: 1, overflowY: "auto" }}>
        {activeTab === "palette" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              className="ai-input"
              placeholder="e.g. sunset, cyberpunk, ocean breeze, autumn forest..."
              value={palettePrompt}
              onChange={(e) => setPalettePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGeneratePalette();
                }
              }}
              rows={2}
              data-ocid="ai_panel.palette.input"
              style={{
                width: "100%",
                resize: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleGeneratePalette}
              disabled={!palettePrompt.trim() || paletteLoading}
              data-ocid="ai_panel.palette.generate_button"
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: 8,
                border: `1px solid ${aiGoldBorder}`,
                background:
                  paletteLoading || !palettePrompt.trim()
                    ? "oklch(0.2 0.005 240)"
                    : aiGoldBg,
                color:
                  paletteLoading || !palettePrompt.trim()
                    ? "oklch(0.4 0.005 240)"
                    : aiGold,
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  paletteLoading || !palettePrompt.trim()
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              {paletteLoading ? (
                <>
                  <span
                    className="ai-loading"
                    style={{ display: "inline-block", fontSize: 14 }}
                  >
                    ⟳
                  </span>
                  Generating...
                </>
              ) : (
                <>✨ Generate Palette</>
              )}
            </button>

            {palette.length > 0 && !paletteLoading && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "oklch(0.5 0.005 240)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  Click a swatch to set as brush color
                </div>
                <div
                  className="ai-swatch-grid"
                  data-ocid="ai_panel.palette.swatch_grid"
                >
                  {palette.map((swatch, i) => {
                    const [, , l] = hexToHsl(swatch.hex);
                    const textColor = l > 55 ? "#1a1a1a" : "#f0f0f0";
                    const isSelected = selectedSwatchIndex === i;
                    return (
                      <button
                        key={swatch.hex + String(i)}
                        type="button"
                        onClick={() => handleSwatchClick(swatch, i)}
                        data-ocid={`ai_panel.palette.swatch.${i + 1}`}
                        title={`${swatch.label}: ${swatch.hex}`}
                        style={{
                          background: swatch.hex,
                          borderRadius: 8,
                          border: isSelected
                            ? "2px solid white"
                            : "1px solid oklch(0.28 0.005 240)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          padding: "4px 4px 6px",
                          height: 64,
                          transition: "all 0.2s ease",
                          outline: "none",
                          boxShadow: isSelected
                            ? `0 0 12px ${swatch.hex}88`
                            : "none",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.transform = "scale(1.06)";
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.boxShadow = `0 0 12px ${swatch.hex}88`;
                          (e.currentTarget as HTMLButtonElement).style.border =
                            "2px solid rgba(255,255,255,0.5)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.transform = "scale(1)";
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.boxShadow = isSelected
                            ? `0 0 12px ${swatch.hex}88`
                            : "none";
                          (e.currentTarget as HTMLButtonElement).style.border =
                            isSelected
                              ? "2px solid white"
                              : "1px solid oklch(0.28 0.005 240)";
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: textColor,
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: 3,
                            padding: "1px 4px",
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                          }}
                        >
                          {swatch.hex.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "oklch(0.38 0.005 240)",
                    textAlign: "center",
                    marginTop: 2,
                  }}
                >
                  {palette.length} colors added to history
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "image" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              className="ai-input"
              placeholder="Describe an image to generate, e.g. 'a sunset over mountains with purple sky'..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateImage();
                }
              }}
              rows={3}
              data-ocid="ai_panel.image.input"
              style={{
                width: "100%",
                resize: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || imageLoading}
              data-ocid="ai_panel.image.generate_button"
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: 8,
                border: `1px solid ${aiGoldBorder}`,
                background:
                  imageLoading || !imagePrompt.trim()
                    ? "oklch(0.2 0.005 240)"
                    : aiGoldBg,
                color:
                  imageLoading || !imagePrompt.trim()
                    ? "oklch(0.4 0.005 240)"
                    : aiGold,
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  imageLoading || !imagePrompt.trim()
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              {imageLoading ? (
                <>
                  <span
                    className="ai-loading"
                    style={{ display: "inline-block", fontSize: 14 }}
                  >
                    ⟳
                  </span>
                  Generating image...
                </>
              ) : (
                <>🖼️ Generate Image</>
              )}
            </button>

            {imageLoading && (
              <div
                data-ocid="ai_panel.image.loading_state"
                style={{
                  borderRadius: 8,
                  background: "oklch(0.18 0.005 240)",
                  border: "1px solid oklch(0.25 0.005 240)",
                  height: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "oklch(0.5 0.005 240)",
                  fontSize: 13,
                }}
              >
                <span className="ai-loading" style={{ fontSize: 28 }}>
                  ⟳
                </span>
                <span>AI is creating your image...</span>
                <span style={{ fontSize: 11, color: "oklch(0.38 0.005 240)" }}>
                  This may take 10–30 seconds
                </span>
              </div>
            )}

            {imageError && !imageLoading && (
              <div
                data-ocid="ai_panel.image.error_state"
                style={{
                  borderRadius: 8,
                  background: "oklch(0.15 0.1 30 / 0.5)",
                  border: "1px solid oklch(0.4 0.2 30 / 0.4)",
                  padding: "10px 12px",
                  color: "oklch(0.75 0.15 30)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {imageError}
              </div>
            )}

            {imageUrl && !imageLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `1px solid ${aiGoldBorder}`,
                    position: "relative",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="AI generated"
                    data-ocid="ai_panel.image.preview"
                    style={{
                      width: "100%",
                      display: "block",
                      borderRadius: 8,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleInsertImage}
                  data-ocid="ai_panel.image.insert_button"
                  style={{
                    width: "100%",
                    padding: "9px",
                    borderRadius: 8,
                    border: "none",
                    background: "oklch(0.72 0.15 200)",
                    color: "oklch(0.08 0.005 240)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(0.78 0.15 200)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 0 12px oklch(0.72 0.15 200 / 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(0.72 0.15 200)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "none";
                  }}
                >
                  + Insert as New Layer
                </button>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  data-ocid="ai_panel.image.regenerate_button"
                  style={{
                    width: "100%",
                    padding: "7px",
                    borderRadius: 8,
                    border: "1px solid oklch(0.25 0.005 240)",
                    background: "transparent",
                    color: "oklch(0.55 0.005 240)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(0.2 0.005 240)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.8 0.005 240)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.55 0.005 240)";
                  }}
                >
                  ↻ Regenerate
                </button>
              </div>
            )}

            {!imageUrl && !imageLoading && !imageError && (
              <div
                style={{
                  borderRadius: 8,
                  background: "oklch(0.15 0.005 240)",
                  border: "1px dashed oklch(0.25 0.005 240)",
                  height: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  color: "oklch(0.38 0.005 240)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>🖼️</span>
                <span>Generated image appears here</span>
                <span style={{ fontSize: 10 }}>Powered by Pollinations AI</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────── */}
      <div
        style={{
          padding: "6px 12px 10px",
          fontSize: 10,
          color: "oklch(0.35 0.005 240)",
          textAlign: "center",
          borderTop: "1px solid oklch(0.2 0.005 240 / 0.5)",
        }}
      >
        Alt+A to toggle · Drag header to move
      </div>
    </div>
  );
}
