import { Component, ReactNode, StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  public state = { error: undefined as Error | undefined };

  public static getDerivedStateFromError(error: Error) {
    return { error };
  }

  public componentDidCatch(error: Error) {
    console.error("Runtime error:", error);
  }

  public render() {
    const { error } = this.state;

    if (error) {
      return (
        <pre className="whitespace-pre-wrap p-4 text-red-600">
          {String(error.message ?? error)}
        </pre>
      );
    }

    return this.props.children;
  }
}

if (import.meta.env.DEV) {
  console.log(
    "Supabase ENV",
    "URL",
    Boolean(import.meta.env.VITE_SUPABASE_URL),
    "ANON",
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  );
}

const App = lazy(() => import("./App"));

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <StrictMode>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Chargement…</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    </StrictMode>
  </ErrorBoundary>,
);
