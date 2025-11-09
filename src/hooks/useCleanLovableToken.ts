import { useEffect } from "react";
import { IS_BROWSER } from "@/lib/env";

export function useCleanLovableToken() {
  useEffect(() => {
    if (!IS_BROWSER) return;
    const url = new URL(window.location.href);
    const key = "__lovable_token";
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
}
