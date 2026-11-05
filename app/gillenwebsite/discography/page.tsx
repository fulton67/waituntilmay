import type { Metadata } from "next";
import Discography from "@/components/gillenwebsite/Discography";
import { releases } from "@/lib/gillenwebsite/discography";

export const metadata: Metadata = {
  title: "Discography · Dylan Neustadter",
  description: "Dylan Neustadter, producer, writer and mixer, and all 36 releases he has produced, written, mixed or played on, newest first.",
};

export default function Page() {
  return <Discography releases={releases} />;
}
