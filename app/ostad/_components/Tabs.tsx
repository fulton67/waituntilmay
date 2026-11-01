"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import css from "../ostad.module.css";

const TABS = [
  ["/ostad", "LIBRARY"],
  ["/ostad/genres", "GENRES"],
  ["/ostad/baseline", "BASELINE"],
  ["/ostad/plan", "PLAN"],
  ["/ostad/questions", "QUESTIONS"],
  ["/ostad/ads", "ADS"],
] as const;

export default function Tabs() {
  const path = usePathname();
  return (
    <nav className={css.tabs}>
      {TABS.map(([href, label], i) => (
        <Link key={href} href={href} className={css.tab} aria-current={path === href ? "page" : undefined}>
          [{String(i + 1).padStart(2, "0")} {label}]
        </Link>
      ))}
    </nav>
  );
}
