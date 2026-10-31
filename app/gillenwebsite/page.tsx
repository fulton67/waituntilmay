import type { Metadata } from "next";
import Site from "@/components/gillenwebsite/Site";
import { releases } from "@/lib/gillenwebsite/discography";
import { card } from "./fonts";

export const metadata: Metadata = {
  title: "Dylan Neustadter",
  description: "Producer, writer, mixer. Every record Dylan Neustadter has worked on, 2018–2026, on a Rolodex.",
};

export default function Page() {
  return <Site releases={releases} mono={card.style.fontFamily} />;
}
