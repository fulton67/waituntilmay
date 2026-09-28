import { ActivityCard } from "@/crm/ui/ActivityFeed";
import { CampaignSection } from "@/crm/ui/CampaignSection";
import { CandidatesTable } from "@/crm/ui/CandidatesTable";
import { HashScroll } from "@/crm/ui/HashScroll";
import { KpiCards } from "@/crm/ui/Kpis";
import { Schedule } from "@/crm/ui/Schedule";

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <HashScroll />
      <div id="overview" className="scroll-mt-4">
        <KpiCards />
      </div>
      <div id="schedule" className="grid scroll-mt-4 grid-cols-1 items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_372px]">
        <Schedule />
        <ActivityCard />
      </div>
      <div id="campaign" className="scroll-mt-4">
        <CampaignSection />
      </div>
      <div id="candidates" className="scroll-mt-4">
        <CandidatesTable />
      </div>
    </div>
  );
}
