import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bankUiCss } from "../styles/bank-ui-css";

const wrapperStyle = {
  width: "100%" as const,
  // minHeight: "100vh" as const,
  display: "block" as const,
};

/**
 * Wraps children in a shadow DOM for style isolation from the host.
 * Host CSS cannot affect the content; package CSS does not leak out.
 * Uses createPortal so children stay in the main React tree; no separate root = no render loop.
 * Shadow DOM avoids iframe timing issues (doc.write/srcdoc load) and works reliably with React Strict Mode.
 */
export function StyleIsolationWrapper({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (host.shadowRoot) {
      const root = host.shadowRoot.getElementById("root");
      if (root instanceof HTMLDivElement) setContainer(root);
      return;
    }

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = bankUiCss;
    shadow.appendChild(style);
    const rootEl = document.createElement("div");
    rootEl.id = "root";
    shadow.appendChild(rootEl);
    setContainer(rootEl);
  }, []);

  return (
    <div ref={hostRef} style={wrapperStyle} data-host="bank-ui-isolation">
      {container ? createPortal(children, container) : null}
    </div>
  );
}
