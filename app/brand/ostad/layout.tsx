import type { Metadata } from "next";
import css from "./brand.module.css";

export const metadata: Metadata = {
  title: "Ostad brand kit",
  description: "Dr. Ariel Ostad's brand kit, measured from his Are.na board and Instagram.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Adobe Fonts kit vzz0hgt (domains: localhost, 127.0.0.1, waituntilmay.com) holds the chosen and losing type systems.
export default function BrandOstadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={css.root}>
      <link rel="stylesheet" href="https://use.typekit.net/vzz0hgt.css" precedence="default" />
      <header className={css.head}>
        <span className={css.mark}>Dr. Ariel Ostad</span>
        <span className={css.kit}>Brand kit</span>
      </header>
      <main className={css.main}>{children}</main>
    </div>
  );
}
