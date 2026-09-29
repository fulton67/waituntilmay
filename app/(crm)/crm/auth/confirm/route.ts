import type { NextRequest } from "next/server";
import { authLanding } from "@/crm/lib/auth-landing";

/** Magic-link landing: token_hash (any browser) or PKCE code. See authLanding. */
export async function GET(req: NextRequest) {
  return authLanding(req);
}
