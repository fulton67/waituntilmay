import type { Metadata } from "next";
import { Archivo, Courier_Prime } from "next/font/google";
import Site from "@/components/gillenwebsite/Site";
import { releases, about } from "@/lib/gillenwebsite/discography";

// Two faces (bible R11): Courier Prime for everything, Archivo (wide) for the one display line. One weight, 400 (R2).
const courier = Courier_Prime({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-courier", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Dylan Neustadter",
  description: "Producer, writer, mixer. Every record Dylan Neustadter has worked on, 2018–2026, on a Rolodex.",
};

export default function Page() {
  return (
    <>
      {/* R16: he signs his code. The credit rides in the served HTML as a comment. */}
      <div hidden dangerouslySetInnerHTML={{ __html: "<!-- Site Development & Design; waituntilmay -->" }} />
      <Site
        releases={releases}
        about={about}
        mono={courier.style.fontFamily}
        display={archivo.style.fontFamily}
        fontClass={`${courier.variable} ${archivo.variable}`}
      />
    </>
  );
}
