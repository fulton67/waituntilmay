"use client";

import { ActivityList } from "@/crm/ui/ActivityFeed";
import { Card } from "@/crm/ui/primitives";
import { useCrm } from "@/crm/ui/store";

export default function ActivityPage() {
  const { data } = useCrm();
  return (
    <Card title="Activity" className="max-w-[760px]">
      <ActivityList items={data.activity} />
    </Card>
  );
}
