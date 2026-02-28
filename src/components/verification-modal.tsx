import React from "react";

const overlayStyles: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 24,
  boxSizing: "border-box",
};

const contentStyles: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  maxWidth: 480,
  width: "100%",
  maxHeight: "60vh",
  overflow: "auto",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
};

export interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Reusable modal overlay for bank verification UI.
 * Uses plain CSS-in-JS, no external modal dependencies.
 */
export function VerificationModal({ open, onClose, children }: VerificationModalProps) {
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bank verification"
      style={overlayStyles}
      onClick={handleBackdropClick}
    >
      <div style={contentStyles} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
