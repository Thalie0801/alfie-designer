import React from "react";

export default function AuthDebug({ session }: { session: unknown }) {
  if (import.meta.env.VITE_SHOW_DEBUG !== "true") return null;
  return (
    <div className="text-xs text-zinc-500 rounded-lg border p-2">
      ENV: ✅ (URL/ANON)
      <br />
      Session: {session ? "active" : "—"}
    </div>
  );
}
