import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/app",
  "/templates",
  "/library",
  "/dashboard",
  "/profile",
  "/affiliate",
];

// Exclut les assets Next et tout /api/health*
export const config = { matcher: ["/((?!_next|static|api/health*).*)"] };

const ACTIVE_PLAN_COOKIE = "hasActivePlan";
const ROLE_COOKIE = "appRole";
const REF_COOKIE = "ref";
const REF_MAX_AGE = 60 * 60 * 24 * 180; // 180 jours

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Propagation du ref
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    response.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: REF_MAX_AGE });
  }

  // Bypass global pour debug / maintenance
  if (
    request.nextUrl.searchParams.get("bypass") === "1" ||
    process.env.DISABLE_MW === "true"
  ) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  // Laisse passer l'API et les assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return response;
  }

  // Filtre routier protégé
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) {
    return response;
  }

  // Admin cookie => accès direct
  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  if (roleCookie === "admin") {
    return response;
  }

  const refCookie = ref || request.cookies.get(REF_COOKIE)?.value;
  let hasActivePlan = request.cookies.get(ACTIVE_PLAN_COOKIE)?.value === "1";

  try {
    // Supabase auth
    const { client, accessToken } = createMiddlewareClient(request, response);

    if (!accessToken) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (refCookie) {
        redirectResponse.cookies.set(REF_COOKIE, refCookie, {
          path: "/",
          maxAge: REF_MAX_AGE,
        });
      }
      return redirectResponse;
    }

    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (refCookie) {
        redirectResponse.cookies.set(REF_COOKIE, refCookie, {
          path: "/",
          maxAge: REF_MAX_AGE,
        });
      }
      return redirectResponse;
    }

    // Vérifie l'abonnement si cookie manquant
    if (!hasActivePlan) {
      const { data: profile } = await client
        .from("profiles")
        .select("plan")
        .eq("id", data.user.id)
        .maybeSingle();

      hasActivePlan = Boolean(profile?.plan);
      response.cookies.set(ACTIVE_PLAN_COOKIE, hasActivePlan ? "1" : "0", {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    if (!hasActivePlan) {
      const billingUrl = new URL("/billing", request.url);
      billingUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(billingUrl);
      if (refCookie) {
        redirectResponse.cookies.set(REF_COOKIE, refCookie, {
          path: "/",
          maxAge: REF_MAX_AGE,
        });
      }
      return redirectResponse;
    }

    return response;
  } catch (err) {
    console.error("[middleware]", err);
    const billingUrl = new URL("/billing", request.url);
    billingUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(billingUrl);
    if (refCookie) {
      redirectResponse.cookies.set(REF_COOKIE, refCookie, {
        path: "/",
        maxAge: REF_MAX_AGE,
      });
    }
    return redirectResponse;
  }
}
