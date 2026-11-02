import type { Metadata } from "next";
import css from "./ostad.module.css";
import Tabs from "./_components/Tabs";
import { ScopeProvider } from "./_components/Scope";
import meta from "./data/meta.json";

export const metadata: Metadata = {
  title: "Ostad Content Intel",
  description: "What cosmetic dermatology video is talking about, why it works, and what Dr. Ariel Ostad makes next.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function OstadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={css.root}>
      <ScopeProvider>
        <header className={css.head}>
          <span className={css.brand}>
            OSTAD CONTENT INTEL <span className={css.mid}>· {meta.videos} videos read · {meta.transcribed} transcribed · {meta.from} → {meta.to}</span>
          </span>
          <Tabs />
        </header>
        <main className={css.main}>{children}</main>
      </ScopeProvider>
    </div>
  );
}
