import type { Metadata } from "next";
import { SettingsView } from "@/crm/ui/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <section className="card" style={{ maxWidth: 760 }}>
      <h2 style={{ marginBottom: 14 }}>Settings</h2>
      <SettingsView />
    </section>
  );
}
