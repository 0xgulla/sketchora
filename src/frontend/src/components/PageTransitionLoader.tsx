import { useEffect, useState } from "react";

interface PageTransitionLoaderProps {
  isLoading: boolean;
}

export default function PageTransitionLoader({
  isLoading,
}: PageTransitionLoaderProps) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Snap to 100% then hide
      setWidth(100);
      const t = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 400);
      return () => clearTimeout(t);
    }
    // Start animation
    setVisible(true);
    setWidth(0);
    // Small tick to trigger transition from 0
    const t1 = setTimeout(() => setWidth(85), 50);
    return () => clearTimeout(t1);
  }, [isLoading]);

  if (!visible && !isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "linear-gradient(90deg, #a855f7, #7c3aed, #6d28d9)",
          transition: isLoading
            ? "width 2.2s cubic-bezier(0.1, 0.8, 0.3, 1)"
            : "width 0.3s ease",
          boxShadow:
            "0 0 12px rgba(168,85,247,0.8), 0 0 4px rgba(168,85,247,1)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
