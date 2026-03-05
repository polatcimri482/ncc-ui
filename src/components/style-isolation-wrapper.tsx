import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { bankUiCss } from "../styles/bank-ui-css";

/**
 * Wraps children in an iframe for full style isolation from the host.
 * Host CSS cannot affect the content; package CSS does not leak out.
 */
export function StyleIsolationWrapper({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

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
    if (!rootEl) return;

    rootRef.current = createRoot(rootEl);
    rootRef.current.render(children);

    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.render(children);
    }
  }, [children]);

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
