import Chrome from "@/components/gillenwebsite/Chrome";
import { releases, about } from "@/lib/gillenwebsite/discography";
import css from "@/components/gillenwebsite/site.module.css";
import { info, title } from "./fonts";

// Two faces (bible R11): the info face for everything, --font-title for the one display line. One weight, 400 (R2).
// The header, footer, clock, cursor readout and release panel persist across the three pages.
export default function GillenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${css.root} ${info.variable} ${title.variable}`}>
      <Chrome releases={releases} about={about}>{children}</Chrome>
    </div>
  );
}
