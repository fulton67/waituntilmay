import Script from "next/script";
import Chrome from "@/components/gillenwebsite/Chrome";
import { releases, about } from "@/lib/gillenwebsite/discography";
import css from "@/components/gillenwebsite/site.module.css";
import { info, title } from "./fonts";

// Two faces (bible R11), one weight, 400 (R2): the info face is Univers Next Pro from the Adobe Fonts kit nsi1nap
// (TeX Gyre Heros, fonts.ts, stands in until it has loaded or where it cannot); the title face is Archivo, for
// Dylan's name and the artist names.
// The header, footer, clock and record view persist across the three pages.
const TYPEKIT = `(function(d) {
    var config = {
      kitId: 'nsi1nap',
      scriptTimeout: 3000,
      async: true
    },
    h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
  })(document);`;
export default function GillenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${css.root} ${info.variable} ${title.variable}`}>
      {/* the kit's embed code, as Adobe gives it */}
      <Script id="typekit-nsi1nap" strategy="afterInteractive">{TYPEKIT}</Script>
      <Chrome releases={releases} about={about}>{children}</Chrome>
    </div>
  );
}
