import React, { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const defaultFallback = (error: Error, reset: () => void) => (
  <div
    className="bank-ui-error-boundary"
    style={{
      padding: 24,
      background: "#f8d7da",
      color: "#721c24",
      borderRadius: 8,
      fontSize: 14,
    }}
  >
    <strong>Something went wrong</strong>
    <p style={{ margin: "8px 0" }}>{error.message}</p>
    <button
      type="button"
      onClick={reset}
      style={{
        padding: "8px 16px",
        background: "#721c24",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      Try again
    </button>
  </div>
);

/**
 * Catches React errors in child components and displays a fallback UI.
 * Use around verification UI or checkout flows to prevent full app crashes.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      const rendered =
        typeof fallback === "function"
          ? fallback(error, this.reset)
          : (fallback ?? defaultFallback(error, this.reset));
      return rendered;
    }

    return children;
  }
}
