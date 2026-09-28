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

// ─── Section navigation: smooth scroll + one-off ring pulse (.card.focus) + scroll-spy ───────

let spyPausedUntil = 0;

export function goToSection(id: SectionId) {
  const el = document.getElementById(id);
  if (!el) return false;
  spyPausedUntil = Date.now() + 700;
  el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  const card = el.classList.contains("card") ? el : ((el.querySelector(".card") as HTMLElement | null) ?? el);
  card.classList.remove("focus");
  void card.offsetWidth;
  card.classList.add("focus");
  window.setTimeout(() => card.classList.remove("focus"), 820);
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

/** Cards fade up once when they first enter the viewport (.card.reveal → .in); never re-run. */
function useReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const show = (el: Element) => el.classList.add("in");
    if (reduceMotion()) {
      document.querySelectorAll(".card.reveal").forEach(show);
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
    const scan = () => document.querySelectorAll(".card.reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
}

// ─── Rail: eyes, sections, drawers, theme, settings ────────────────────────

function useActiveSection(): [SectionId | null, (id: SectionId) => void] {
  const pathname = usePathname();
  const onOverview = pathname === "/crm";
  const [spy, setSpy] = useState<SectionId>("overview");
  const onChange = useCallback((id: SectionId) => setSpy(id), []);
  useScrollSpy(onOverview, onChange);
  const routeActive: SectionId | null = pathname.startsWith("/crm/schedule") ? "schedule" : pathname.startsWith("/crm/candidates") ? "candidates" : null;
  return [onOverview ? spy : routeActive, setSpy];
}

function Rail() {
  const pathname = usePathname();
  const router = useRouter();
  const { panel, openPanel } = useCrm();
  const [theme, toggleTheme] = useTheme();
  const [active, setActive] = useActiveSection();
  const navRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ x: number; y: number } | null>(null);

  // One pill slides to the active icon (prototype: .45s cubic-bezier(.3,1.4,.4,1)).
  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
      setInd(el ? { x: el.offsetLeft, y: el.offsetTop } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  const go = (id: SectionId) => {
    setActive(id);
    if (pathname === "/crm" && goToSection(id)) return;
    router.push(id === "overview" ? "/crm" : `/crm#${id}`);
  };

  return (
    <aside className="rail" aria-label="CRM" data-testid="rail">
      <button type="button" className="mark logo" onClick={toggleTheme} aria-label="Switch theme" title="Switch theme" data-testid="eyes" />
      <nav ref={navRef}>
        <span className={cx("ind", ind && "show")} style={ind ? { transform: `translate(${ind.x}px, ${ind.y}px)` } : undefined} data-testid="rail-indicator" aria-hidden />
        {SECTIONS.map((n) => (
          <button
            key={n.id}
            type="button"
            data-nav={n.id}
            aria-label={n.label}
            title={n.label}
            aria-current={active === n.id ? "location" : undefined}
            className={active === n.id ? "on" : undefined}
            onClick={() => go(n.id)}
          >
            <Icon name={n.icon} />
          </button>
        ))}
        {PANELS.map((n) => (
          <button
            key={n.id}
            type="button"
            data-nav={n.id}
            aria-label={n.label}
            title={n.label}
            aria-expanded={panel?.name === n.id}
            className={cx(panel?.name === n.id && "lit", n.id === "areas" && "rail-areas")}
            onClick={() => openPanel(n.id)}
          >
            <Icon name={n.icon} />
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <button
        type="button"
        className="tog"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title="Theme"
        data-testid="theme-toggle"
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </button>
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-expanded={panel?.name === "settings"}
        className={panel?.name === "settings" ? "lit" : undefined}
        onClick={() => openPanel("settings")}
      >
        <Icon name="settings" />
      </button>
    </aside>
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

const popCls = "absolute right-0 top-12 z-40 rounded-[22px] bg-(--card) p-4 shadow-(--shadow)";

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
        className="icon-btn"
        aria-label={`Activity${fresh ? `, ${fresh} new` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setSeen(latest);
        }}
      >
        <Icon name="bell" />
        {fresh > 0 && <span className="dot">{fresh}</span>}
      </button>
      {open && (
        <div className={popCls} style={{ width: 340, maxWidth: "calc(100vw - 32px)" }}>
          <div className="card-head">
            <h2>Recent activity</h2>
            <Link href="/crm/activity" onClick={() => setOpen(false)} className="link">
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
      <button type="button" className="me" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Avatar name={data.me.name} color={data.me.color} size={28} className="avatar" />
        <span className="who text-left">
          <b>{data.me.name}</b>
          <small>Interviewer</small>
        </span>
      </button>
      {open && (
        <div className={popCls} style={{ width: 224, padding: 6 }}>
          <p className="one-line" style={{ padding: "8px 12px", fontSize: 13, color: "var(--muted)" }}>
            {data.me.email}
          </p>
          <button
            type="button"
            className="block w-full rounded-xl px-3 py-2 text-left font-medium hover:bg-(--card-2)"
            onClick={() => {
              setOpen(false);
              openPanel("settings");
            }}
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

function Header() {
  const { data } = useCrm();
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <header className="top">
      <div className="brand">
        <Link href="/crm" aria-label="fomo Intern CRM">
          <span className="mark wordmark" />
        </Link>
        <span className="sep" aria-hidden />
        <h1>
          Intern CRM <span>Today, {formatDay(data.today, "long")}</span>
        </h1>
      </div>
      <form
        role="search"
        className="search"
        style={{ marginLeft: "auto" }}
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/crm/candidates${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
        }}
      >
        <Icon name="search" size={16} className="flex-none text-(--muted)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates" aria-label="Search candidates" />
      </form>
      <div className="actions">
        <Bell />
        <UserChip />
      </div>
    </header>
  );
}

// ─── Drawer, toasts ────────────────────────────────────────────────────────

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
    <>
      <div className="scrim on" onClick={closeDrawer} />
      <aside role="dialog" aria-modal aria-label="Candidate" data-testid="drawer" className="drawer on">
        <CandidateRecord key={drawer.candidateId + drawer.tab} candidateId={drawer.candidateId} initialTab={drawer.tab} variant="drawer" />
      </aside>
    </>
  );
}

function Toasts() {
  const { toasts } = useCrm();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === "warn" ? "alert" : "status"} className={cx("toast", t.tone === "warn" && "warn")}>
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
    <div className="app" data-testid="crm-shell" data-pending={pending || undefined} aria-busy={pending || undefined}>
      <Rail />
      <div className="content">
        <Header />
        {children}
      </div>
      <Drawer />
      <Panels />
      <AssignModal />
      <Toasts />
    </div>
  );
}
