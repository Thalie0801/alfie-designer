export const IS_BROWSER = typeof window !== "undefined";
export const HOST = IS_BROWSER ? window.location.host : "";
export const IS_LOVABLE_PREVIEW =
  IS_BROWSER && (HOST.endsWith(".lovable.app") || HOST === "lovable.dev");
