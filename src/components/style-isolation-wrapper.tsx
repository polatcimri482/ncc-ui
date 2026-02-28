import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bankUiCss } from "../styles/bank-ui-css";

/**
 * Wraps children in a Shadow DOM to isolate package styles from host styles.
 * Host CSS cannot penetrate; package CSS does not leak out.
 */
export function StyleIsolationWrapper({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Reuse existing shadow root (React Strict Mode double-mounts in dev)
    let shadow = host.shadowRoot;
    if (!shadow) {
      shadow = host.attachShadow({ mode: "open" });
      // Base reset so host dark theme doesn't inherit into shadow (color/background flow through)
      const reset = document.createElement("style");
      reset.textContent = `:host{color:#1f2937;background-color:#ffffff;}`;
      shadow.appendChild(reset);
      const style = document.createElement("style");
      style.textContent = bankUiCss;
      shadow.appendChild(style);
    }

    // Container for portaled content
    const container = document.createElement("div");
    shadow.appendChild(container);

    setMountNode(container);

    return () => {
      container.remove();
      setMountNode(null);
    };
  }, []);

  return (
    <div ref={hostRef}>
      {mountNode ? createPortal(children, mountNode) : null}
    </div>
  );
}
