import React from "react";

export function Spinner({ size = 40 }: { size?: number }) {
  const border = Math.max(2, Math.floor(size / 8));
  return (
    <div
      className="bank-ui-spinner"
      style={
        {
          "--bank-ui-spinner-size": `${size}px`,
          "--bank-ui-spinner-border": `${border}px`,
        } as React.CSSProperties
      }
    />
  );
}
