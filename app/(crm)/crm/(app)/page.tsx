import { ActivityCard } from "@/crm/ui/ActivityFeed";
import { CampaignSection } from "@/crm/ui/CampaignSection";
import { CandidatesTable } from "@/crm/ui/CandidatesTable";
import { HashScroll } from "@/crm/ui/HashScroll";
import { KpiCards } from "@/crm/ui/Kpis";
import { Schedule } from "@/crm/ui/Schedule";

/** Sections are direct children of the shell's .content column (flex, gap 14px). */
export default function OverviewPage() {
  return (
    <>
      <HashScroll />
      <div id="overview">
        <KpiCards />
      </div>
      <div id="schedule" className="mid">
        <Schedule />
        <ActivityCard />
      </div>
      <div id="campaign">
        <CampaignSection />
      </div>
      <div id="candidates">
        <CandidatesTable />
      </div>
    </>
  );
}
