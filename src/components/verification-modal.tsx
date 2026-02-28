import React from "react";

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
      className="bank-ui-modal-overlay"
      onClick={handleBackdropClick}
    >
      <div className="bank-ui-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
