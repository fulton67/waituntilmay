import type { Metadata } from "next";
import { info, title } from "./fonts";
import Site from "@/components/gillenwebsite/Site";
import { releases, about } from "@/lib/gillenwebsite/discography";

// Two faces (bible R11): the info face for everything, --font-title for the one display line. One weight, 400 (R2).

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
        mono={info.style.fontFamily}
        display={title.style.fontFamily}
        fontClass={`${info.variable} ${title.variable}`}
      />
    </>
  );
}
