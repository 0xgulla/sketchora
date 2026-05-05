import {
  ChevronDown,
  Download,
  FileImage,
  FilePlus,
  FolderOpen,
  ImageUp,
  Menu,
  Minus,
  Moon,
  Plus,
  Redo2,
  Save,
  Share2,
  Sun,
  Undo2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { UIAccent, UITheme } from "../App";

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200];

const ACCENT_COLOR = "oklch(0.72 0.15 200)";
const ACCENT_BG = "oklch(0.72 0.15 200 / 0.12)";
const ACCENT_BORDER = "oklch(0.72 0.15 200 / 0.35)";

interface TopNavBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo?: () => void;
  canUndo: boolean;
  onExport: () => void;
  uiTheme: UITheme;
  uiAccent: UIAccent;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  colorTheme: "light" | "dark";
  onColorThemeChange: (t: "light" | "dark") => void;
  profileImage: string | null;
  onProfileImageChange: (url: string) => void;
  onSettingsOpen: () => void;
  onImportImage?: (file: File) => void;
  onExportPng?: () => void;
  onExportJpg?: () => void;
}

function AutoFocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return <input ref={ref} {...props} />;
}

export default function TopNavBar({
  projectName,
  onProjectNameChange,
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  canUndo,
  onExport,
  uiTheme,
  brushColor,
  onBrushColorChange,
  colorTheme,
  onColorThemeChange,
  profileImage,
  onProfileImageChange,
  onSettingsOpen,
  onImportImage,
  onExportPng,
  onExportJpg,
}: TopNavBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const accentColor =
    uiTheme === "purple" ? "oklch(0.65 0.22 290)" : ACCENT_COLOR;
  const accentBg =
    uiTheme === "purple" ? "oklch(0.65 0.22 290 / 0.12)" : ACCENT_BG;
  const accentBorder =
    uiTheme === "purple" ? "oklch(0.65 0.22 290 / 0.35)" : ACCENT_BORDER;
  const panelBg = uiTheme === "purple" ? "#120e1e" : "oklch(0.12 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.25 0.06 290)" : "oklch(0.22 0.005 240)";

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim()) onProjectNameChange(nameValue.trim());
    else setNameValue(projectName);
  };

  const btnBase = {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer" as const,
    transition: "all 0.15s",
    color: "oklch(0.7 0.005 240)",
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) onProfileImageChange(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportImage?.(file);
    e.target.value = "";
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [menuOpen]);

  const menuItems = [
    { label: "New Project", icon: FilePlus, action: () => { setMenuOpen(false); } },
    { label: "Open Project", icon: FolderOpen, action: () => { setMenuOpen(false); } },
    { label: "Import Image", icon: ImageUp, action: () => { setMenuOpen(false); importInputRef.current?.click(); } },
    { divider: true },
    { label: "Save", icon: Save, action: () => { setMenuOpen(false); onExport(); } },
    { label: "Save As", icon: Save, action: () => { setMenuOpen(false); onExport(); } },
    { divider: true },
    { label: "Export PNG", icon: FileImage, action: () => { setMenuOpen(false); onExportPng ? onExportPng() : onExport(); } },
    { label: "Export JPG", icon: Download, action: () => { setMenuOpen(false); onExportJpg ? onExportJpg() : onExport(); } },
    { divider: true },
    { label: "Share", icon: Share2, action: () => { setMenuOpen(false); } },
  ];

  return (
    <header
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        flexShrink: 0,
        zIndex: 50,
        background: panelBg,
        borderBottom: `1px solid ${panelBorder}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.5)",
        transition: "background 0.3s ease",
      }}
    >
      {/* LEFT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Menu button */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            data-ocid="menu.button"
            style={{
              ...btnBase,
              width: 32,
              height: 32,
              background: menuOpen ? accentBg : "transparent",
              border: `1px solid ${menuOpen ? accentBorder : "transparent"}`,
              color: menuOpen ? accentColor : "oklch(0.7 0.005 240)",
            }}
            aria-label="Menu"
          >
            <Menu size={16} />
          </button>

          {menuOpen && (
            <div
              data-ocid="menu.dropdown_menu"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                background: "oklch(0.14 0.006 240)",
                border: "1px solid oklch(0.22 0.005 240)",
                borderRadius: 10,
                padding: "4px",
                zIndex: 200,
                boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
                minWidth: 180,
                animation: "float-in 0.15s ease-out",
              }}
            >
              {menuItems.map((item, i) => {
                if ("divider" in item && item.divider) {
                  return (
                    <div
                      key={`divider-${i}`}
                      style={{
                        height: 1,
                        background: "oklch(0.22 0.005 240)",
                        margin: "3px 4px",
                      }}
                    />
                  );
                }
                const Icon = (item as { icon: typeof FilePlus }).icon;
                return (
                  <button
                    key={(item as { label: string }).label}
                    type="button"
                    onClick={(item as { action: () => void }).action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      width: "100%",
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "oklch(0.78 0.005 240)",
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                      textAlign: "left" as const,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.2 0.005 240)";
                      (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.95 0.005 240)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.78 0.005 240)";
                    }}
                  >
                    <Icon size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                    {(item as { label: string }).label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={importInputRef}
          type="file"
          accept="image/*"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />

        {editingName ? (
          <AutoFocusInput
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setEditingName(false);
                setNameValue(projectName);
              }
              e.stopPropagation();
            }}
            data-ocid="topnav.project_name.input"
            style={{
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              borderRadius: 6,
              color: "oklch(0.95 0.005 240)",
              fontSize: 13,
              fontWeight: 600,
              padding: "3px 8px",
              outline: "none",
              width: 160,
              fontFamily: "inherit",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingName(true);
              setNameValue(projectName);
            }}
            data-ocid="topnav.project_name.input"
            style={{
              ...btnBase,
              padding: "4px 8px",
              fontSize: 13,
              fontWeight: 600,
              color: "oklch(0.9 0.005 240)",
              letterSpacing: "-0.01em",
              height: 28,
            }}
            className="hover:bg-white/8 hover:text-white"
            title="Click to rename"
          >
            {projectName}
          </button>
        )}

        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          <motion.button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            whileTap={{ scale: 0.92 }}
            data-ocid="topnav.undo.button"
            title="Undo (Ctrl+Z)"
            style={{
              ...btnBase,
              width: 30,
              height: 30,
              opacity: canUndo ? 1 : 0.3,
            }}
            className="hover:bg-white/8 hover:text-white disabled:cursor-not-allowed"
          >
            <Undo2 size={14} />
          </motion.button>
          <motion.button
            type="button"
            onClick={onRedo}
            whileTap={{ scale: 0.92 }}
            data-ocid="topnav.redo.button"
            title="Redo"
            style={{ ...btnBase, width: 30, height: 30, opacity: 0.4 }}
            className="hover:bg-white/8 hover:text-white"
          >
            <Redo2 size={14} />
          </motion.button>
        </div>
      </div>

      {/* CENTER: Zoom */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          style={{ ...btnBase, width: 26, height: 26 }}
          className="hover:bg-white/8 hover:text-white"
          title="Zoom out"
        >
          <Minus size={12} />
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowZoomMenu((v) => !v)}
            data-ocid="topnav.zoom.select"
            style={{
              ...btnBase,
              padding: "4px 8px",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "oklch(0.85 0.005 240)",
              border: `1px solid ${showZoomMenu ? accentBorder : "transparent"}`,
              background: showZoomMenu ? accentBg : "transparent",
              minWidth: 58,
              height: 28,
            }}
            className="hover:bg-white/8"
          >
            {zoom}%
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </button>
          {showZoomMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "oklch(0.15 0.006 240)",
                border: "1px solid oklch(0.25 0.005 240)",
                borderRadius: 10,
                padding: "4px",
                zIndex: 100,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                minWidth: 80,
                animation: "float-in 0.15s ease-out",
              }}
            >
              {ZOOM_LEVELS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => {
                    onZoomChange(z);
                    setShowZoomMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "5px 10px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: z === zoom ? 700 : 400,
                    color: z === zoom ? accentColor : "oklch(0.75 0.005 240)",
                    background: z === zoom ? accentBg : "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.1s",
                  }}
                >
                  {z}%
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(200, zoom + 25))}
          style={{ ...btnBase, width: 26, height: 26 }}
          className="hover:bg-white/8 hover:text-white"
          title="Zoom in"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* RIGHT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        {/* Color swatch */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
          title="Active brush color"
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: brushColor,
              border: "2px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              transition: "background 0.2s",
            }}
            onClick={() => document.getElementById("nav-color-input")?.click()}
            onKeyDown={() => {}}
          />
          <input
            id="nav-color-input"
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            data-ocid="topnav.brush_color.input"
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Theme toggle: Sun/Moon */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "2px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => onColorThemeChange("light")}
            data-ocid="topnav.theme_light.toggle"
            title="Light mode"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                colorTheme === "light"
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
              color: colorTheme === "light" ? "#fbbf24" : "#6b6b70",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.25s ease",
            }}
          >
            <Sun size={14} />
          </button>
          <button
            type="button"
            onClick={() => onColorThemeChange("dark")}
            data-ocid="topnav.theme_dark.toggle"
            title="Dark mode"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                colorTheme === "dark"
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
              color: colorTheme === "dark" ? accentColor : "#6b6b70",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.25s ease",
            }}
          >
            <Moon size={14} />
          </button>
        </div>

        <div
          style={{ width: 1, height: 20, background: "oklch(0.25 0.005 240)" }}
        />

        {/* Profile avatar */}
        <div style={{ position: "relative" }}>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileUpload}
            data-ocid="topnav.profile.upload_button"
            style={{ display: "none" }}
          />
          <div
            onClick={() => profileInputRef.current?.click()}
            onKeyDown={() => {}}
            title="Upload profile picture"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: profileImage ? "transparent" : "oklch(0.65 0.18 160)",
              border: "2px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "You"
            )}
          </div>
        </div>

        <div
          style={{ width: 1, height: 20, background: "oklch(0.25 0.005 240)" }}
        />

        <motion.button
          type="button"
          onClick={onExport}
          whileTap={{ scale: 0.95 }}
          data-ocid="topnav.export.button"
          title="Export as PNG"
          style={{
            ...btnBase,
            padding: "0 10px",
            height: 30,
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: "oklch(0.75 0.005 240)",
            border: "1px solid oklch(0.25 0.005 240)",
          }}
          className="hover:bg-white/8 hover:text-white hover:border-white/20"
        >
          <Download size={13} />
          Export
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          data-ocid="topnav.share.button"
          title="Share"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 12px",
            height: 30,
            borderRadius: 8,
            border: `1px solid ${accentBorder}`,
            background: accentBg,
            color: accentColor,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          <Share2 size={13} />
          Share
        </motion.button>
      </div>

      {(showZoomMenu) && (
        <button
          type="button"
          aria-label="Close menus"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "transparent",
            border: "none",
            cursor: "default",
          }}
          onClick={() => { setShowZoomMenu(false); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setShowZoomMenu(false); }
          }}
        />
      )}
    </header>
  );
}
