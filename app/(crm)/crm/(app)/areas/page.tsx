import type { Metadata } from "next";
import { AreasView } from "@/crm/ui/AreasView";

export const metadata: Metadata = { title: "Areas & goals" };

export default function AreasPage() {
  return <AreasView />;
}
