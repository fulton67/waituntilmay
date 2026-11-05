import type { Metadata } from "next";
import About from "@/components/gillenwebsite/About";
import { about } from "@/lib/gillenwebsite/discography";

export const metadata: Metadata = {
  title: "About · Dylan Neustadter",
  description: "Dylan Neustadter, producer, writer, mixer and multi-instrumentalist.",
};

export default function Page() {
  return <About about={about} />;
}
