"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { supabaseBrowser } from "../lib/supabase/browser";
import { CRM_TZ, nowMinutesIn, todayIn } from "../lib/time";
import type { ActionResult, CrmData } from "../lib/types";

export type Patch = (d: CrmData) => CrmData;
export type RecordTab = "notes" | "interviews" | "resume" | "assignments";
export type Panel = "rankings" | "areas" | "daylog" | "settings" | "nextup";
export type AssignTarget = { taskId?: string; candidateId?: string; areaId?: string; day?: string };
type Toast = { id: number; message: string; tone: "info" | "warn" };

type Ctx = {
  data: CrmData;
  pending: boolean;
  /** Apply `patch` optimistically, run the server action, surface its error as a toast. */
  mutate: <T>(patch: Patch | null, action: () => Promise<ActionResult<T>>, success?: string) => Promise<ActionResult<T>>;
  drawer: { candidateId: string; tab: RecordTab } | null;
  openCandidate: (candidateId: string, tab?: RecordTab) => void;
  closeDrawer: () => void;
  panel: { name: Panel; day?: string; areaId?: string } | null;
  openPanel: (name: Panel, opts?: { day?: string; areaId?: string }) => void;
  closePanel: () => void;
  assign: AssignTarget | null;
  openAssign: (target?: AssignTarget) => void;
  closeAssign: () => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
};

const CrmContext = createContext<Ctx | null>(null);

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm outside CrmProvider");
  return ctx;
}

export function CrmProvider({ data: serverData, children }: { data: CrmData; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, addOptimistic] = useOptimistic(serverData, (state: CrmData, patch: Patch) => patch(state));
  const [drawer, setDrawer] = useState<Ctx["drawer"]>(null);
  const [panel, setPanel] = useState<Ctx["panel"]>(null);
  const [assign, setAssign] = useState<AssignTarget | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "warn" ? 6000 : 3200);
  }, []);

  const mutate = useCallback<Ctx["mutate"]>(
    (patch, action, success) =>
      new Promise((resolve) => {
        startTransition(async () => {
          if (patch) addOptimistic(patch);
          let res: Awaited<ReturnType<typeof action>>;
          try {
            res = await action();
          } catch {
            res = { ok: false, error: "Couldn't reach the server. Check your connection." };
          }
          if (!res.ok) toast(res.error, "warn");
          else if (success) toast(success);
          resolve(res);
        });
      }),
    [addOptimistic, toast],
  );

  const openCandidate = useCallback((candidateId: string, tab: RecordTab = "notes") => setDrawer({ candidateId, tab }), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const openPanel = useCallback((name: Panel, opts: { day?: string; areaId?: string } = {}) => setPanel({ name, ...opts }), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const openAssign = useCallback((target: AssignTarget = {}) => setAssign(target), []);
  const closeAssign = useCallback(() => setAssign(null), []);

  useLiveUpdates(serverData.realtime, router.refresh);

  const value = useMemo(
    () => ({ data, pending, mutate, drawer, openCandidate, closeDrawer, panel, openPanel, closePanel, assign, openAssign, closeAssign, toasts, toast }),
    [data, pending, mutate, drawer, openCandidate, closeDrawer, panel, openPanel, closePanel, assign, openAssign, closeAssign, toasts, toast],
  );
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

/**
 * Other interviewers' changes: Supabase Realtime when configured (any change on the watched
 * tables refreshes the route), otherwise refresh on window focus and every 60s.
 */
function useLiveUpdates(realtime: CrmData["realtime"], refresh: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 400);
    };

    if (realtime) {
      const supabase = supabaseBrowser(realtime);
      const channel = supabase.channel("crm-live");
      for (const table of ["interviews", "notes", "candidates", "activity", "tasks", "sessions", "reports"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, soon);
      }
      channel.subscribe();
      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }

    const onFocus = () => document.visibilityState === "visible" && soon();
    const interval = setInterval(() => document.visibilityState === "visible" && refresh(), 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [realtime, refresh]);
}

// ─── Clock: today + minutes since midnight in the CRM timezone. null during SSR. ────────────

let clockKey = "";
let clockSnap: { today: string; nowMin: number; nowMs: number } | null = null;
function readClock() {
  const now = new Date();
  const today = todayIn(CRM_TZ, now);
  const nowMin = nowMinutesIn(CRM_TZ, now);
  const key = `${today}|${nowMin}`;
  if (key !== clockKey) {
    clockKey = key;
    clockSnap = { today, nowMin, nowMs: now.getTime() };
  }
  return clockSnap;
}
function subscribeClock(cb: () => void) {
  const t = setInterval(cb, 20_000);
  return () => clearInterval(t);
}

export function useClock() {
  return useSyncExternalStore(subscribeClock, readClock, () => null);
}

// ─── Theme: data-theme on <html>, persisted in localStorage. ────────────────────────────────

export type Theme = "light" | "dark";
export const THEME_TURN_EVENT = "crm:theme-turn";
let themingTimer = 0;

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light" as Theme,
  );
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next: Theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    // ~650ms colour crossfade, and tell the eyes which way to turn.
    root.classList.add("theming");
    // The rail's eyes play the prototype's .turn animation (see Eyes.tsx).
    window.dispatchEvent(new CustomEvent(THEME_TURN_EVENT, { detail: next }));
    window.clearTimeout(themingTimer);
    themingTimer = window.setTimeout(() => root.classList.remove("theming"), 650);
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("crm-theme", next);
    } catch {
      // storage unavailable — the choice lasts for this page view
    }
  }, []);
  return [theme, toggle];
}
