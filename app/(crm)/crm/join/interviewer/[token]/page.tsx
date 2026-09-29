import type { Metadata } from "next";
import { JoinScreen } from "@/crm/ui/JoinScreen";

export const metadata: Metadata = { title: "Join as an interviewer", robots: { index: false } };

export default async function JoinInterviewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinScreen role="interviewer" token={token} />;
}
