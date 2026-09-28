import type { Metadata } from "next";
import { SettingsView } from "@/crm/ui/SettingsView";
import { allowedEmails } from "@/crm/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsView allowlist={allowedEmails()} />;
}
