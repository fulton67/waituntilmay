import type { Metadata } from "next";
import { Schedule } from "@/crm/ui/Schedule";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return <Schedule />;
}
