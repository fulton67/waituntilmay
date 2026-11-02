"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import css from "../ostad.module.css";

const TABS = [
  ["/ostad", "READ"],
  ["/ostad/themes", "THEMES"],
  ["/ostad/watch", "WATCH"],
  ["/ostad/cares", "CARES"],
  ["/ostad/plan", "PLAN"],
  ["/ostad/him", "HIM"],
] as const;

export default function Tabs() {
  const path = usePathname();
  return (
    <nav className={css.tabs}>
      {TABS.map(([href, label], i) => {
        const on = href === "/ostad" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={css.tab} aria-current={on ? "page" : undefined}>
            [{String(i + 1).padStart(2, "0")} {label}]
          </Link>
        );
      })}
    </nav>
  );
}
