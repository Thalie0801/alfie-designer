const LOVABLE_TOKEN_QUERY_KEY = "__lovable_token";
const LOVABLE_SESSION_EXCHANGE_ENDPOINT = "/api/session/exchange";
const LOVABLE_COOKIE_MAX_AGE_SECONDS = 60 * 5; // 5 minutes

let inMemoryLovableToken: string | null = null;
let exchangePromise: Promise<void> | null = null;

type LocationLike = { href: string };
type HistoryLike = {
  replaceState: (data: unknown, unused: string, url?: string | null) => void;
};

export type MinimalBrowserWindow = {
  location: LocationLike;
  history: HistoryLike;
};

export type StripTokenResult = {
  token: string | null;
  cleanedHref: string;
  changed: boolean;
};

export function stripLovableTokenFromUrl(url: URL): StripTokenResult {
  if (!url.searchParams.has(LOVABLE_TOKEN_QUERY_KEY)) {
    return { token: null, cleanedHref: url.toString(), changed: false };
  }

  const token = url.searchParams.get(LOVABLE_TOKEN_QUERY_KEY);
  url.searchParams.delete(LOVABLE_TOKEN_QUERY_KEY);

  return {
    token: token ?? null,
    cleanedHref: url.toString(),
    changed: true,
  };
}

async function exchangeLovableTokenForSession(token: string) {
  try {
    const response = await fetch(LOVABLE_SESSION_EXCHANGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error(
        "[LovableToken] Token exchange failed",
        response.status,
        payload,
      );
    }
  } catch (error) {
    console.error("[LovableToken] Unable to exchange token", error);
  }
}

export function initializeLovableTokenFromUrl(win?: MinimalBrowserWindow) {
  const runtimeWindow = (() => {
    if (win) return win;
    if (typeof window !== "undefined") return window as MinimalBrowserWindow;
    return null;
  })();

  if (!runtimeWindow) {
    return;
  }

  try {
    const url = new URL(runtimeWindow.location.href);
    const { token, cleanedHref, changed } = stripLovableTokenFromUrl(url);

    if (changed && typeof runtimeWindow.history?.replaceState === "function") {
      runtimeWindow.history.replaceState({}, "", cleanedHref);
    }

    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      inMemoryLovableToken = null;
      return;
    }

    inMemoryLovableToken = normalizedToken;

    if (!exchangePromise) {
      exchangePromise = exchangeLovableTokenForSession(normalizedToken).finally(
        () => {
          exchangePromise = null;
        },
      );
    }
  } catch (error) {
    console.error("[LovableToken] Failed to inspect URL for token", error);
  }
}

export function getLovableToken() {
  return inMemoryLovableToken;
}

export function getLovableAuthHeader(): Record<string, string> {
  const token = getLovableToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function resetLovableTokenStateForTesting() {
  inMemoryLovableToken = null;
  exchangePromise = null;
}

export function getLovableCookieMaxAgeSeconds() {
  return LOVABLE_COOKIE_MAX_AGE_SECONDS;
}

export const LOVABLE_TOKEN_KEY = LOVABLE_TOKEN_QUERY_KEY;
export const LOVABLE_SESSION_ENDPOINT = LOVABLE_SESSION_EXCHANGE_ENDPOINT;
