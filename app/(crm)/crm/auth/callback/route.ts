import type { NextRequest } from "next/server";
import { authLanding } from "@/crm/lib/auth-landing";

/** Links emailed before /crm/auth/confirm existed still land here. Same handler. */
export async function GET(req: NextRequest) {
  return authLanding(req);
}
