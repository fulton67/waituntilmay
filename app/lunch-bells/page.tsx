import type { Metadata } from "next";
import LunchBellsPage from "@/components/LunchBellsPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LunchBellsRoute() {
  return <LunchBellsPage />;
}
