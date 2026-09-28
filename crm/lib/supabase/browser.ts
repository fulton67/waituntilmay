"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseBrowser(cfg: { url: string; anonKey: string }): SupabaseClient {
  client ??= createBrowserClient(cfg.url, cfg.anonKey);
  return client;
}
