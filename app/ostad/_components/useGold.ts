"use client";
import { useCallback, useSyncExternalStore } from "react";

/** A gold pick: the key is "img:{id}" or "mot:{id}", with a one-line note and when it was picked. */
export type Pick = { note: string; at: number };
type Store = Record<string, Pick>;
const KEY = "ostad-refs-gold-v1";
const EMPTY: Store = {};

// one parsed copy, refreshed only when the raw string changes, so the snapshot stays referentially stable
let raw: string | null = null;
let cache: Store = EMPTY;
const listeners = new Set<() => void>();

function snapshot(): Store {
  let r: string | null = null;
  try {
    r = localStorage.getItem(KEY);
  } catch {
    return cache; // storage blocked: keep the in-memory picks
  }
  if (r !== raw) {
    raw = r;
    try {
      cache = r ? (JSON.parse(r) as Store) : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
  } catch {
    /* private window or blocked storage: picks last for this visit only */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Picks live in this browser's localStorage (shared across tabs). The server render sees none. */
export function useGold() {
  const gold = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const toggle = useCallback((k: string) => {
    const next = { ...snapshot() };
    if (next[k]) delete next[k];
    else next[k] = { note: "", at: Date.now() };
    write(next);
  }, []);
  const note = useCallback((k: string, text: string) => {
    const cur = snapshot();
    if (cur[k]) write({ ...cur, [k]: { ...cur[k], note: text } });
  }, []);
  return { gold, toggle, note };
}
