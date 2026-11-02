"use client";
import { createContext, useContext, useEffect, useState } from "react";
import css from "../ostad.module.css";

// One switch for every tab: makeable-by-Ostad only (default) or everything. Remembered per browser.
const Ctx = createContext<{ all: boolean; setAll: (b: boolean) => void }>({ all: false, setAll: () => {} });
const KEY = "ostad.showEverything";

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const [all, setAllState] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setAllState(true);
    } catch {}
  }, []);
  const setAll = (b: boolean) => {
    setAllState(b);
    try {
      localStorage.setItem(KEY, b ? "1" : "0");
    } catch {}
  };
  return <Ctx.Provider value={{ all, setAll }}>{children}</Ctx.Provider>;
}

export const useScope = () => useContext(Ctx);

export function ScopeToggle({ makeable, total }: { makeable: number; total: number }) {
  const { all, setAll } = useScope();
  return (
    <button className={all ? css.on : css.off} onClick={() => setAll(!all)} aria-pressed={all} data-testid="show-everything">
      [{all ? "×" : " "} show everything]{" "}
      <span className={css.mid}>{all ? `all ${total} videos` : `makeable by Ostad only: ${makeable} of ${total}`}</span>
    </button>
  );
}
