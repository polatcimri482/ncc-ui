import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bankUiCss } from "../styles/bank-ui-css";

/**
 * Wraps children in an iframe for full style isolation from the host.
 * Host CSS cannot affect the content; package CSS does not leak out.
 * Uses createPortal so children stay in the main React tree; no separate root = no render loop.
 */
export function StyleIsolationWrapper({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${bankUiCss}</style></head><body><div id="root"></div></body></html>`
    );
    doc.close();

    const rootEl = doc.getElementById("root");
    if (rootEl instanceof HTMLDivElement) {
      setContainer(rootEl);
    }

    return () => setContainer(null);
  }, []);

  if (!container) {
    return (
      <iframe
        ref={iframeRef}
        style={{
          width: "100%",
          border: "none",
          minHeight: "100vh",
          display: "block",
        }}
        title="Bank verification"
      />
    );
  }

  return (
    <>
      <iframe
        ref={iframeRef}
        style={{
          width: "100%",
          border: "none",
          minHeight: "100vh",
          display: "block",
        }}
        title="Bank verification"
      />
      {createPortal(children, container)}
    </>
  );
}
