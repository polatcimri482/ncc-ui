import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/**
 * Reusable modal overlay for bank verification UI.
 * Portals to document.body and uses inline styles for full style isolation —
 * host app CSS cannot bleed in, and this component needs no global CSS import.
 */
export function VerificationModal({ open, onClose, children }: VerificationModalProps) {
  const isMobile = useIsMobile();

  if (!open || typeof document === "undefined") return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: isMobile ? 0 : 24,
    boxSizing: "border-box",
  };

  const contentStyle: React.CSSProperties = {
    background: "#fff",
    color: "#000",
    borderRadius: isMobile ? 0 : 8,
    maxWidth: isMobile ? "none" : 480,
    width: "100%",
    maxHeight: isMobile ? "none" : "90vh",
    overflow: "auto",
    boxShadow: isMobile ? "none" : "0 4px 20px rgba(0,0,0,0.15)",
    padding: 16,
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bank verification"
      style={overlayStyle}
    >
      <div style={contentStyle}>{children}</div>
    </div>,
    document.body,
  );
}
