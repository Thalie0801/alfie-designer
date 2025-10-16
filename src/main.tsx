import { Component, ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = { error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Runtime error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 16, color: "crimson", whiteSpace: "pre-wrap" }}>
          {String(this.state.error?.message ?? this.state.error)}
        </pre>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
