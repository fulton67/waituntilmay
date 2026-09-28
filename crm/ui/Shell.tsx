"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { signOut } from "../lib/auth-actions";
import { formatDay } from "../lib/time";
import { ActivityList } from "./ActivityFeed";
import { CandidateRecord } from "./CandidateRecord";
import { Panels } from "./Panels";
import { Avatar, Icon, cx, type IconName } from "./primitives";
import { useCrm, useTheme, type Panel } from "./store";
import { AssignModal } from "./Tasks";

export type SectionId = "overview" | "schedule" | "campaign" | "candidates";
const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "schedule", label: "Schedule", icon: "schedule" },
  { id: "campaign", label: "Campaign & assignments", icon: "flag" },
  { id: "candidates", label: "Candidates", icon: "candidates" },
];
// Rail order: eyes, Overview, Schedule, Campaign & assignments, Candidates, then the two drawers.
const PANELS: { id: Panel; label: string; icon: IconName }[] = [
  { id: "areas", label: "Areas & goals", icon: "areas" },
  { id: "rankings", label: "Rankings & tiers", icon: "rank" },
];

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── Section navigation: smooth scroll + one-off ring pulse + scroll-spy ─────────────────────

let spyPausedUntil = 0;

export function goToSection(id: SectionId) {
  const el = document.getElementById(id);
  if (!el) return false;
  spyPausedUntil = Date.now() + 700;
  el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  const card = (el.querySelector("section") as HTMLElement | null) ?? el;
  card.classList.remove("crm-pulse");
  void card.offsetWidth;
  card.classList.add("crm-pulse");
  window.setTimeout(() => card.classList.remove("crm-pulse"), 820);
  return true;
}

/** The section with the most visible height in the viewport's middle band. */
function useScrollSpy(enabled: boolean, onChange: (id: SectionId) => void) {
  useEffect(() => {
    if (!enabled) return;
    const visible = new Map<SectionId, number>();
    const pick = () => {
      if (Date.now() < spyPausedUntil) return;
      if (window.scrollY < 8) return onChange("overview");
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) return onChange("candidates");
      let best: SectionId | null = null;
      let bestH = 0;
      for (const [id, h] of visible) {
        if (h > bestH) {
          best = id;
          bestH = h;
        }
      }
      if (best) onChange(best);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id as SectionId, e.isIntersecting ? e.intersectionRect.height : 0);
        pick();
      },
      { rootMargin: "-20% 0px -35% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    window.addEventListener("scroll", pick, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", pick);
    };
  }, [enabled, onChange]);
}

/** Cards fade up once when they first enter the viewport; never re-run on scroll-up. */
function useReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-in");
    if (reduceMotion()) {
      document.querySelectorAll(".crm-reveal").forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    const scan = () => document.querySelectorAll(".crm-reveal:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
}

// ─── Eyes mark: sprite frame by theme, plays the turn on switch ─────────────────────────────

function Eyes({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Switch theme" title="Switch theme" className={cx("grid place-items-center", className)}>
      <span className="crm-mark crm-eyes" data-testid="eyes" />
    </button>
  );
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

// ─── Rail (desktop) / bottom bar (mobile) ──────────────────────────────────

function useActiveSection(): [SectionId | "settings" | null, (id: SectionId) => void] {
  const pathname = usePathname();
  const onOverview = pathname === "/crm";
  const [spy, setSpy] = useState<SectionId>("overview");
  const onChange = useCallback((id: SectionId) => setSpy(id), []);
  useScrollSpy(onOverview, onChange);
  const routeActive: SectionId | "settings" | null = pathname.startsWith("/crm/schedule")
    ? "schedule"
    : pathname.startsWith("/crm/candidates")
      ? "candidates"
      : pathname.startsWith("/crm/settings")
        ? "settings"
        : null;
  return [onOverview ? spy : routeActive, setSpy];
}

function NavItems({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { panel, openPanel } = useCrm();
  const [active, setActive] = useActiveSection();
  const [, toggleTheme] = useTheme();
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; y: number } | null>(null);
  const panels = orientation === "vertical" ? PANELS : PANELS.filter((p) => p.id === "rankings");

  // Measure the active icon; the pill slides there with a slight overshoot.
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    setPill(el ? { x: el.offsetLeft, y: el.offsetTop } : null);
  }, [active, orientation]);

  const go = (id: SectionId) => {
    setActive(id);
    if (pathname === "/crm" && goToSection(id)) return;
    router.push(id === "overview" ? "/crm" : `/crm#${id}`);
  };

  const iconCls = (on: boolean, tint = false) =>
    cx(
      "relative z-[1] grid size-11 flex-none place-items-center rounded-2xl transition-colors",
      on ? "text-white" : tint ? "bg-(--tint) text-(--brand)" : "text-(--muted) hover:text-(--ink)",
    );

  return (
    <div
      ref={listRef}
      className={cx("relative flex items-center", orientation === "vertical" ? "flex-col gap-2" : "w-full justify-between gap-1")}
      data-testid={orientation === "vertical" ? "rail" : "bottom-bar"}
    >
      {pill && (
        <span
          aria-hidden
          className="crm-rail-pill absolute left-0 top-0 size-11 rounded-2xl bg-(--brand)"
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)` }}
          data-testid="rail-indicator"
        />
      )}
      {orientation === "horizontal" && <Eyes className="size-11 flex-none" onClick={toggleTheme} />}
      {SECTIONS.map((n) => (
        <button
          key={n.id}
          type="button"
          data-nav={n.id}
          aria-label={n.label}
          title={n.label}
          aria-current={active === n.id ? "location" : undefined}
          onClick={() => go(n.id)}
          className={iconCls(active === n.id)}
        >
          <Icon name={n.icon} />
        </button>
      ))}
      {panels.map((n) => (
        <button
          key={n.id}
          type="button"
          data-nav={n.id}
          aria-label={n.label}
          title={n.label}
          aria-expanded={panel?.name === n.id}
          onClick={() => openPanel(n.id)}
          className={iconCls(false, panel?.name === n.id)}
        >
          <Icon name={n.icon} />
        </button>
      ))}
      {orientation === "horizontal" && (
        <>
          <ThemeButton className="size-11 flex-none" />
          <button type="button" aria-label="Settings" onClick={() => openPanel("settings")} className={iconCls(false, panel?.name === "settings")}>
            <Icon name="settings" />
          </button>
        </>
      )}
    </div>
  );
}

function Rail() {
  const [, toggleTheme] = useTheme();
  const { panel, openPanel } = useCrm();
  return (
    <nav aria-label="CRM" className="sticky top-0 hidden h-screen w-[72px] flex-none flex-col items-center gap-2 py-5 min-[900px]:flex">
      <Eyes className="mb-4 size-11" onClick={toggleTheme} />
      <NavItems orientation="vertical" />
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeButton />
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          aria-expanded={panel?.name === "settings"}
          onClick={() => openPanel("settings")}
          className={cx(
            "grid size-10 place-items-center rounded-xl",
            panel?.name === "settings" ? "bg-(--tint) text-(--brand)" : "text-(--muted) hover:bg-(--card-2) hover:text-(--ink)",
          )}
        >
          <Icon name="settings" />
        </button>
      </div>
    </nav>
  );
}

function BottomBar() {
  return (
    <nav
      aria-label="CRM mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-(--line) bg-(--card) px-2 pt-1.5 min-[900px]:hidden"
      style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
    >
      <NavItems orientation="horizontal" />
    </nav>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

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
  const { data, openPanel } = useCrm();
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
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openPanel("settings");
            }}
            className="block w-full rounded-xl px-3 py-2 text-left font-medium hover:bg-(--card-2)"
          >
            Settings
          </button>
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

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/crm/candidates${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
      className={cx("relative", className)}
    >
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search candidates"
        aria-label="Search candidates"
        className="h-10 w-full rounded-xl border border-(--line) bg-(--card) pl-9 pr-3 outline-none placeholder:text-(--muted) focus:border-(--brand)"
      />
    </form>
  );
}

function Header() {
  const { data } = useCrm();
  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-4 min-[900px]:px-6">
      <Link href="/crm" className="flex items-center gap-3" aria-label="fomo Intern CRM">
        <span className="crm-mark crm-wordmark" />
      </Link>
      <span className="h-5 w-px bg-(--line)" aria-hidden />
      <p className="min-w-0 truncate font-medium">
        Intern CRM <span className="hidden text-(--muted) min-[900px]:inline">· Today, {formatDay(data.today, "long")}</span>
      </p>
      <div className="ml-auto flex items-center gap-2">
        <SearchBox className="hidden w-[240px] min-[900px]:block" />
        <Bell />
        <ThemeButton />
        <UserChip />
      </div>
      <SearchBox className="w-full min-[900px]:hidden" />
    </header>
  );
}

// ─── Drawers, toasts ───────────────────────────────────────────────────────

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
    <div className="crm-toasts pointer-events-none fixed left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
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
  useReveal();
  return (
    <div className="flex min-h-screen" data-testid="crm-shell" data-pending={pending || undefined} aria-busy={pending || undefined}>
      <Rail />
      <div className="min-w-0 flex-1">
        <Header />
        <main className="px-4 pb-28 min-[900px]:pb-12 min-[900px]:pl-2 min-[900px]:pr-6">{children}</main>
      </div>
      <BottomBar />
      <Drawer />
      <Panels />
      <AssignModal />
      <Toasts />
    </div>
  );
}
