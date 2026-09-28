import { requireInterviewer } from "@/crm/lib/auth";
import { loadCrmData } from "@/crm/lib/queries";
import { IntroOverlay } from "@/crm/ui/IntroOverlay";
import { Shell } from "@/crm/ui/Shell";
import { CrmProvider } from "@/crm/ui/store";

export default async function CrmAppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireInterviewer();
  const data = await loadCrmData(me);
  return (
    <CrmProvider data={data}>
      <Shell>{children}</Shell>
      <IntroOverlay />
    </CrmProvider>
  );
}
