import { X } from "lucide-react";
import type { CanvasTheme, PageSizeKey } from "../App";

interface FloatingSettingsModalProps {
  pageColor: string;
  onPageColorChange: (c: string) => void;
  canvasTheme: CanvasTheme;
  onCanvasThemeChange: (t: CanvasTheme) => void;
  pageSizeKey: PageSizeKey;
  onPageSizeChange: (k: PageSizeKey) => void;
  onClose: () => void;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  onExport: () => void;
}

const PAGE_SIZES: PageSizeKey[] = ["A4", "A5", "Letter", "Square", "Custom"];

export default function FloatingSettingsModal({
  pageColor,
  onPageColorChange,
  canvasTheme,
  onCanvasThemeChange,
  pageSizeKey,
  onPageSizeChange,
  onClose,
  accentColor,
  accentBg,
  accentBorder,
  onExport,
}: FloatingSettingsModalProps) {
  const bg = "rgba(16,16,20,0.98)";
  const border = "rgba(255,255,255,0.09)";
  const labelStyle = {
    fontSize: 10,
    fontWeight: 600 as const,
    color: "#6b6b70",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 6,
    display: "block",
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 149,
          background: "transparent",
          border: "none",
          cursor: "default",
        }}
      />
      <div
        data-ocid="settings_modal.modal"
        style={{
          position: "fixed",
          right: 16,
          top: 58,
          width: 288,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 14,
          boxShadow: "0 16px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 150,
          overflow: "hidden",
          animation: "float-in 0.22s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: `1px solid ${border}`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e8ec" }}>
            Settings
          </span>
          <button
            type="button"
            onClick={onClose}
            data-ocid="settings_modal.close_button"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "#6b6b70",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Canvas Theme */}
          <div>
            <span style={labelStyle}>Canvas Theme</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["light", "dark"] as CanvasTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onCanvasThemeChange(t)}
                  data-ocid={"settings_modal.canvas_theme.button"}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    border: `1.5px solid ${canvasTheme === t ? accentBorder : "rgba(255,255,255,0.08)"}`,
                    background:
                      canvasTheme === t ? accentBg : "rgba(255,255,255,0.03)",
                    color: canvasTheme === t ? accentColor : "#a1a1aa",
                    fontSize: 12,
                    fontWeight: canvasTheme === t ? 700 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Page Size */}
          <div>
            <span style={labelStyle}>Page Size</span>
            <select
              value={pageSizeKey}
              onChange={(e) => onPageSizeChange(e.target.value as PageSizeKey)}
              data-ocid="settings_modal.page_size.select"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e8e8ec",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
                fontFamily: "inherit",
                appearance: "none",
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s} style={{ background: "#1a1a1e" }}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Page Color */}
          <div>
            <span style={labelStyle}>Page Color</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="color"
                value={pageColor}
                onChange={(e) => onPageColorChange(e.target.value)}
                data-ocid="settings_modal.page_color.input"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  padding: 2,
                  background: "transparent",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "#a1a1aa",
                  fontFamily: "monospace",
                }}
              >
                {pageColor}
              </span>
            </div>
          </div>

          {/* Export Settings */}
          <div>
            <span style={labelStyle}>Export</span>
            <button
              type="button"
              onClick={() => {
                onExport();
                onClose();
              }}
              data-ocid="settings_modal.export.button"
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 8,
                border: `1.5px solid ${accentBorder}`,
                background: accentBg,
                color: accentColor,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              Export as PNG
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
