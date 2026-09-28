import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "../env";

/** Refreshes the Supabase session cookie and returns the signed-in email (or null). */
export async function refreshSupabaseSession(req: NextRequest): Promise<{ response: NextResponse; email: string | null }> {
  const cfg = supabaseConfig()!;
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        response = NextResponse.next({ request: req });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { response, email: data.user?.email ?? null };
}
