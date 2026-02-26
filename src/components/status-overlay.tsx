import React from "react";
import { Spinner } from "./spinner";

interface StatusOverlayProps {
  message?: string;
}

export function StatusOverlay({ message = "Processing..." }: StatusOverlayProps) {
  return (
    <div className="bank-ui-overlay">
      <div className="bank-ui-overlay-content">
        <div className="bank-ui-overlay-spinner">
          <Spinner size={48} />
        </div>
        <p className="bank-ui-overlay-message">{message}</p>
      </div>
    </div>
  );
}
