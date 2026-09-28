import { ActivityCard } from "@/crm/ui/ActivityFeed";
import { CandidatesTable } from "@/crm/ui/CandidatesTable";
import { KpiCards } from "@/crm/ui/Kpis";
import { Schedule } from "@/crm/ui/Schedule";

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <KpiCards />
      <div className="grid grid-cols-1 items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_372px]">
        <Schedule />
        <ActivityCard />
      </div>
      <CandidatesTable />
    </div>
  );
}
