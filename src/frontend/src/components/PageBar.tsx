import { Copy, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIAccent } from "../App";

interface PageBarProps {
  pages: { id: number; name: string; thumbnail?: string }[];
  activePageId: number;
  onSelectPage: (id: number) => void;
  onAddPage: () => void;
  onDeletePage: (id: number) => void;
  onRenamePage: (id: number, newName: string) => void;
  onDuplicatePage?: (id: number) => void;
  uiAccent: UIAccent;
}

export default function PageBar({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onDuplicatePage,
  uiAccent,
}: PageBarProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [bouncingAdd, setBouncingAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (id: number, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const commitEdit = () => {
    if (editingId !== null) {
      onRenamePage(editingId, editValue);
    }
    setEditingId(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleAddPage = useCallback(() => {
    setBouncingAdd(true);
    onAddPage();
    setTimeout(() => setBouncingAdd(false), 400);
  }, [onAddPage]);

  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 select-none overflow-x-auto transition-colors duration-300"
      style={{
        background: uiAccent.headerBg,
        borderTop: `1px solid ${uiAccent.headerBorder}`,
        minHeight: "44px",
        scrollbarWidth: "none",
      }}
    >
      {/* Page tabs */}
      <div className="flex items-center gap-1 flex-1">
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          const isEditing = editingId === page.id;

          return (
            <div
              key={page.id}
              className="flex flex-col items-center rounded-xl transition-all duration-200"
              style={{
                background: isActive ? uiAccent.accentBg : "transparent",
                border: isActive
                  ? `1.5px solid ${uiAccent.accentBorder}`
                  : "1.5px solid transparent",
                boxShadow: isActive
                  ? `0 0 8px ${uiAccent.accentBorder}`
                  : "none",
              }}
            >
              {/* Thumbnail strip */}
              {page.thumbnail && (
                <div
                  style={{
                    width: 40,
                    height: 28,
                    borderRadius: "6px 6px 0 0",
                    overflow: "hidden",
                    flexShrink: 0,
                    borderBottom: `1px solid ${isActive ? uiAccent.accentBorder : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <img
                    src={page.thumbnail}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              )}

              <div className="flex items-center">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    data-ocid={`page_bar.input.${index + 1}`}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") cancelEdit();
                      e.stopPropagation();
                    }}
                    className="px-2 py-1 text-xs font-medium rounded-md outline-none"
                    style={{
                      background: uiAccent.accentBg,
                      border: `1px solid ${uiAccent.accent}80`,
                      color: uiAccent.accent,
                      minWidth: "60px",
                      maxWidth: "120px",
                      width: `${Math.max(60, editValue.length * 8 + 16)}px`,
                    }}
                    maxLength={24}
                  />
                ) : (
                  <button
                    type="button"
                    data-ocid={`page_bar.tab.${index + 1}`}
                    onClick={() => onSelectPage(page.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditing(page.id, page.name);
                    }}
                    className="flex items-center px-2 py-1 text-xs font-medium whitespace-nowrap"
                    style={{
                      color: isActive ? uiAccent.accent : "#6b6b70",
                      background: "transparent",
                      border: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#a0a0a8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#6b6b70";
                      }
                    }}
                    title="Double-click to rename"
                  >
                    {page.name}
                  </button>
                )}

                {/* Duplicate page button */}
                {onDuplicatePage && !isEditing && (
                  <button
                    type="button"
                    data-ocid={`page_bar.duplicate_button.${index + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(page.id);
                    }}
                    className="flex items-center justify-center w-4 h-4 rounded mr-0.5 transition-all duration-150"
                    style={{
                      color: isActive ? `${uiAccent.accent}80` : "#3a3a3e",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = uiAccent.accentBg;
                      e.currentTarget.style.color = uiAccent.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = isActive
                        ? `${uiAccent.accent}80`
                        : "#3a3a3e";
                    }}
                    aria-label={`Duplicate ${page.name}`}
                    title={`Duplicate ${page.name}`}
                  >
                    <Copy size={9} />
                  </button>
                )}

                {/* Delete page button */}
                {pages.length > 1 && !isEditing && (
                  <button
                    type="button"
                    data-ocid={`page_bar.delete_button.${index + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    className="flex items-center justify-center w-4 h-4 rounded mr-1 transition-all duration-150"
                    style={{
                      color: isActive ? `${uiAccent.accent}99` : "#4a4a4e",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(248,113,113,0.15)";
                      e.currentTarget.style.color = "#f87171";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = isActive
                        ? `${uiAccent.accent}99`
                        : "#4a4a4e";
                    }}
                    aria-label={`Delete ${page.name}`}
                    title={`Delete ${page.name}`}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add page button */}
      <button
        type="button"
        data-ocid="page_bar.add_button"
        onClick={handleAddPage}
        className={`flex items-center gap-1 px-2 h-7 rounded-xl transition-all duration-150 flex-shrink-0 text-xs font-semibold ${
          bouncingAdd ? "add-page-bounce" : ""
        }`}
        style={{
          color: "#8888a0",
          border: `1.5px dashed ${uiAccent.headerBorder}`,
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = uiAccent.accentBg;
          e.currentTarget.style.color = uiAccent.accent;
          e.currentTarget.style.borderColor = uiAccent.accentBorder;
          e.currentTarget.style.boxShadow = `0 0 12px ${uiAccent.accentBorder}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#8888a0";
          e.currentTarget.style.borderColor = uiAccent.headerBorder;
          e.currentTarget.style.boxShadow = "none";
        }}
        aria-label="Add new page"
        title="Add New Page"
      >
        <Plus size={12} />
        <span>Page</span>
      </button>
    </div>
  );
}
