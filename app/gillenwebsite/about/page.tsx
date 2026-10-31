import type { Metadata } from "next";
import AboutIndex from "@/components/gillenwebsite/AboutIndex";
import { releases, about } from "@/lib/gillenwebsite/discography";

export const metadata: Metadata = {
  title: "About · Dylan Neustadter",
  description: "Dylan Neustadter, producer, writer and mixer, and an index of every release he has worked on.",
};

export default function Page() {
  return <AboutIndex releases={releases} about={about} />;
}
