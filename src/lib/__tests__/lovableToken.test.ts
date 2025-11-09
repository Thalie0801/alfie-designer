import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLovableAuthHeader,
  getLovableToken,
  initializeLovableTokenFromUrl,
  resetLovableTokenStateForTesting,
  stripLovableTokenFromUrl,
  type MinimalBrowserWindow,
} from "../lovableToken";

describe("stripLovableTokenFromUrl", () => {
  it("extracts token and removes it from the URL", () => {
    const url = new URL("https://example.com/path?__lovable_token=abc123&foo=bar");
    const result = stripLovableTokenFromUrl(url);

    expect(result.token).toBe("abc123");
    expect(result.changed).toBe(true);
    expect(result.cleanedHref).toBe("https://example.com/path?foo=bar");
  });

  it("returns unchanged info when the token is missing", () => {
    const url = new URL("https://example.com/path?foo=bar");
    const result = stripLovableTokenFromUrl(url);

    expect(result.token).toBeNull();
    expect(result.changed).toBe(false);
    expect(result.cleanedHref).toBe("https://example.com/path?foo=bar");
  });
});

describe("initializeLovableTokenFromUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetLovableTokenStateForTesting();
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => "",
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    resetLovableTokenStateForTesting();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("stores the token, exchanges it, and cleans the URL", async () => {
    const replaceState = vi.fn();
    const fakeWindow: MinimalBrowserWindow = {
      location: { href: "https://example.com/app?__lovable_token=my-token&foo=1" },
      history: { replaceState },
    };

    initializeLovableTokenFromUrl(fakeWindow);

    expect(replaceState).toHaveBeenCalledWith({}, "", "https://example.com/app?foo=1");
    expect(getLovableToken()).toBe("my-token");
    expect(getLovableAuthHeader()).toEqual({ Authorization: "Bearer my-token" });
    expect(global.fetch).toHaveBeenCalledWith("/api/session/exchange", {
      credentials: "include",
      headers: { Authorization: "Bearer my-token" },
      method: "POST",
    });
  });

  it("ignores empty tokens but still cleans the URL", () => {
    const replaceState = vi.fn();
    const fakeWindow: MinimalBrowserWindow = {
      location: { href: "https://example.com/app?__lovable_token=&foo=1" },
      history: { replaceState },
    };

    initializeLovableTokenFromUrl(fakeWindow);

    expect(replaceState).toHaveBeenCalledWith({}, "", "https://example.com/app?foo=1");
    expect(getLovableToken()).toBeNull();
    expect(getLovableAuthHeader()).toEqual({});
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
