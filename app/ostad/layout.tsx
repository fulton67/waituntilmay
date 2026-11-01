import type { Metadata } from "next";
import css from "./ostad.module.css";
import Tabs from "./_components/Tabs";
import analysis from "./data/analysis.json";

export const metadata: Metadata = {
  title: "Ostad Content Intel",
  description: "What is working in cosmetic dermatology video right now, and a month of content for Dr. Ariel Ostad.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function OstadLayout({ children }: { children: React.ReactNode }) {
  const t = analysis.totals;
  return (
    <div className={css.root}>
      <header className={css.head}>
        <span className={css.brand}>
          OSTAD CONTENT INTEL <span className={css.mid}>· {t.videos} videos · {t.from} → {t.to}</span>
        </span>
        <Tabs />
      </header>
      <main className={css.main}>{children}</main>
    </div>
  );
}
