import { supabase } from "@/integrations/supabase/client";

export interface SessionRoleAndPacks {
  role?: string;
  packs: string[];
}

export async function getSessionRoleAndPacks(): Promise<SessionRoleAndPacks> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Impossible de récupérer la session: ${error.message}`);
  }

  const session = data.session;
  const role = typeof session?.user?.app_metadata?.role === "string" ? session.user.app_metadata.role : undefined;
  const rawPacks = session?.user?.app_metadata?.packs as unknown;
  const packs = Array.isArray(rawPacks)
    ? rawPacks.filter((pack): pack is string => typeof pack === "string")
    : [];

  return { role, packs };
}

export async function requireAdminStudio(): Promise<void> {
  const { role, packs } = await getSessionRoleAndPacks();

  if (role !== "admin" || !packs.includes("studio")) {
    throw new Error("Accès réservé : admin + Pack Studio");
  }
}
