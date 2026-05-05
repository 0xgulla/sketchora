import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UIAccent } from "../App";

interface PageBarProps {
  pages: { id: number; name: string }[];
  activePageId: number;
  onSelectPage: (id: number) => void;
  onAddPage: () => void;
  onDeletePage: (id: number) => void;
  onRenamePage: (id: number, newName: string) => void;
  uiAccent: UIAccent;
}

export default function PageBar({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onRenamePage,
  uiAccent,
}: PageBarProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
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

  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 select-none overflow-x-auto transition-colors duration-300"
      style={{
        background: uiAccent.headerBg,
        borderBottom: `1px solid ${uiAccent.headerBorder}`,
        minHeight: "36px",
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
              className="flex items-center rounded-md transition-all duration-150"
              style={{
                background: isActive ? uiAccent.accentBg : "transparent",
                border: isActive
                  ? `1px solid ${uiAccent.accentBorder}`
                  : "1px solid transparent",
              }}
            >
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
                  className="flex items-center px-3 py-1 text-xs font-medium whitespace-nowrap"
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

              {/* Delete page button — only show when more than 1 page and not editing */}
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
                    e.currentTarget.style.background = "rgba(248,113,113,0.15)";
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
          );
        })}
      </div>

      {/* Add page button */}
      <button
        type="button"
        data-ocid="page_bar.add_button"
        onClick={onAddPage}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 flex-shrink-0"
        style={{
          color: "#6b6b70",
          border: `1px solid ${uiAccent.headerBorder}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = uiAccent.hoverBg;
          e.currentTarget.style.color = "#e8e8ec";
          e.currentTarget.style.borderColor = uiAccent.accentBorder;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#6b6b70";
          e.currentTarget.style.borderColor = uiAccent.headerBorder;
        }}
        aria-label="Add new page"
        title="Add new page"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
