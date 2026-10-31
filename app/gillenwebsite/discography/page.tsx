import type { Metadata } from "next";
import Discography from "@/components/gillenwebsite/Discography";
import { releases } from "@/lib/gillenwebsite/discography";

export const metadata: Metadata = {
  title: "Discography · Dylan Neustadter",
  description: "All 36 releases Dylan Neustadter has produced, written, mixed or played on, newest first.",
};

export default function Page() {
  return <Discography releases={releases} />;
}
