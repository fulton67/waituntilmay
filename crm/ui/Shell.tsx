"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "../lib/auth-actions";
import { formatDay } from "../lib/time";
import { ActivityList } from "./ActivityFeed";
import { CandidateRecord } from "./CandidateRecord";
import { Avatar, Icon, cx, type IconName } from "./primitives";
import { useCrm, useTheme } from "./store";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/crm", label: "Overview", icon: "overview" },
  { href: "/crm/schedule", label: "Schedule", icon: "schedule" },
  { href: "/crm/candidates", label: "Candidates", icon: "candidates" },
  { href: "/crm/areas", label: "Areas & goals", icon: "areas" },
  { href: "/crm/activity", label: "Activity", icon: "activity" },
];

function isActive(pathname: string, href: string) {
  return href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);
}

function ThemeButton({ className }: { className?: string }) {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      data-testid="theme-toggle"
      className={cx("grid size-10 place-items-center rounded-xl text-(--muted) hover:bg-(--card-2) hover:text-(--ink)", className)}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

function Rail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="CRM"
      className="sticky top-0 hidden h-screen w-[72px] flex-none flex-col items-center gap-2 py-5 min-[900px]:flex"
    >
      <Link href="/crm" aria-label="fomo Intern CRM home" className="mb-4 grid size-11 place-items-center">
        <span className="crm-mark crm-eyes" />
      </Link>
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-label={n.label}
            title={n.label}
            aria-current={active ? "page" : undefined}
            className={cx(
              "grid size-11 place-items-center rounded-2xl transition-colors",
              active ? "bg-(--brand) text-white" : "text-(--muted) hover:bg-(--card) hover:text-(--ink)",
            )}
          >
            <Icon name={n.icon} />
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeButton />
        <Link
          href="/crm/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={pathname.startsWith("/crm/settings") ? "page" : undefined}
          className={cx(
            "grid size-10 place-items-center rounded-xl",
            pathname.startsWith("/crm/settings") ? "bg-(--brand) text-white" : "text-(--muted) hover:bg-(--card-2) hover:text-(--ink)",
          )}
        >
          <Icon name="settings" />
        </Link>
      </div>
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="CRM" className="crm-scroll flex gap-1 overflow-x-auto px-4 pb-3 min-[900px]:hidden">
      {[...NAV, { href: "/crm/settings", label: "Settings", icon: "settings" as IconName }].map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className={cx(
            "inline-flex h-9 flex-none items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium",
            isActive(pathname, n.href) ? "bg-(--brand) text-white" : "text-(--muted) hover:bg-(--card)",
          )}
        >
          <Icon name={n.icon} size={16} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Bell() {
  const { data } = useCrm();
  const { open, setOpen, ref } = usePopover();
  const [seen, setSeen] = useState<string | null>(null);
  const latest = data.activity[0]?.createdAt ?? null;
  const fresh = data.activity.filter((a) => a.actorId !== data.me.id && (!seen || a.createdAt > seen)).slice(0, 9).length;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Activity${fresh ? `, ${fresh} new` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setSeen(latest);
        }}
        className="relative grid size-10 place-items-center rounded-xl text-(--muted) hover:bg-(--card) hover:text-(--ink)"
      >
        <Icon name="bell" />
        {fresh > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-(--highlight) px-1 text-[10px] font-bold text-(--highlight-ink)">
            {fresh}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[340px] max-w-[calc(100vw-32px)] rounded-[22px] border border-(--line) bg-(--card) p-4 shadow-(--shadow)">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">Recent activity</p>
            <Link href="/crm/activity" onClick={() => setOpen(false)} className="text-[13px] font-medium text-(--brand)">
              See all
            </Link>
          </div>
          <ActivityList items={data.activity.slice(0, 8)} onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function UserChip() {
  const { data } = useCrm();
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-xl border border-(--line) bg-(--card) pl-1.5 pr-3 hover:bg-(--card-2)"
      >
        <Avatar name={data.me.name} color={data.me.color} size={28} />
        <span className="hidden font-medium sm:inline">{data.me.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-(--line) bg-(--card) p-1.5 shadow-(--shadow)">
          <p className="truncate px-3 py-2 text-[13px] text-(--muted)">{data.me.email}</p>
          <Link href="/crm/settings" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 font-medium hover:bg-(--card-2)">
            Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className="block w-full rounded-xl px-3 py-2 text-left font-medium hover:bg-(--card-2)">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { data } = useCrm();
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-4 min-[900px]:px-6">
      <Link href="/crm" className="flex items-center gap-3" aria-label="fomo Intern CRM">
        <span className="crm-mark crm-eyes !w-7 min-[900px]:hidden" />
        <span className="crm-mark crm-wordmark" />
      </Link>
      <span className="h-5 w-px bg-(--line)" aria-hidden />
      <p className="min-w-0 truncate font-medium">
        Intern CRM <span className="text-(--muted)">· Today, {formatDay(data.today, "long")}</span>
      </p>
      <div className="ml-auto flex items-center gap-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/crm/candidates${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
          className="relative hidden md:block"
        >
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidates"
            aria-label="Search candidates"
            className="h-10 w-[240px] rounded-xl border border-(--line) bg-(--card) pl-9 pr-3 outline-none placeholder:text-(--muted) focus:border-(--brand)"
          />
        </form>
        <Bell />
        <ThemeButton />
        <UserChip />
      </div>
    </header>
  );
}

function Drawer() {
  const { drawer, closeDrawer } = useCrm();
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, closeDrawer]);
  if (!drawer) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="crm-backdrop absolute inset-0 bg-[rgba(11,9,31,0.35)]" onClick={closeDrawer} />
      <aside
        role="dialog"
        aria-modal
        aria-label="Candidate"
        data-testid="drawer"
        className="crm-drawer absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-(--line) bg-(--canvas) shadow-(--shadow) min-[900px]:w-[min(940px,92vw)]"
      >
        <CandidateRecord key={drawer.candidateId + drawer.tab} candidateId={drawer.candidateId} initialTab={drawer.tab} variant="drawer" />
      </aside>
    </div>
  );
}

function Toasts() {
  const { toasts } = useCrm();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "warn" ? "alert" : "status"}
          className={cx(
            "crm-toast pointer-events-auto max-w-[min(520px,calc(100vw-32px))] rounded-2xl border px-4 py-3 font-medium shadow-(--shadow)",
            t.tone === "warn" ? "border-(--highlight) bg-(--card) text-(--highlight)" : "border-(--line) bg-(--ink) text-(--canvas)",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { pending } = useCrm();
  return (
    <div className="flex min-h-screen" data-testid="crm-shell" data-pending={pending || undefined} aria-busy={pending || undefined}>
      <Rail />
      <div className="min-w-0 flex-1">
        <Header />
        <MobileNav />
        <main className="px-4 pb-12 min-[900px]:pl-2 min-[900px]:pr-6">{children}</main>
      </div>
      <Drawer />
      <Toasts />
    </div>
  );
}

