import type { Metadata } from "next";
import { crmFont } from "@/crm/ui/fonts";
import { INTRO_SKIP_SCRIPT } from "@/crm/ui/intro";
import "./prototype.css";
import "./crm.css";

export const metadata: Metadata = {
  title: { default: "Intern CRM · fomo", template: "%s · Intern CRM" },
  robots: { index: false, follow: false },
};

// Sets data-theme on <html> before the CRM paints: saved choice, else the OS preference.
// Also marks the intro sting as skipped (see crm/ui/intro.ts).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("crm-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function CrmRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + ";" + INTRO_SKIP_SCRIPT }} />
      <div data-crm className={crmFont.variable}>
        {children}
      </div>
    </>
  );
}
