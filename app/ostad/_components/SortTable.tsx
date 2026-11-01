"use client";
import { useMemo, useState, type ReactNode } from "react";
import css from "../ostad.module.css";

export type Col<T> = { key: string; label: string; num?: boolean; get: (r: T) => number | string | null; show?: (r: T) => ReactNode };

export default function SortTable<T>({ rows, cols, initial, desc = true, testid }: { rows: T[]; cols: Col<T>[]; initial: string; desc?: boolean; testid?: string }) {
  const [key, setKey] = useState(initial);
  const [down, setDown] = useState(desc);
  const sorted = useMemo(() => {
    const c = cols.find((x) => x.key === key) ?? cols[0];
    return [...rows].sort((a, b) => {
      const x = c.get(a), y = c.get(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return down ? -r : r;
    });
  }, [rows, cols, key, down]);
  return (
    <div className={css.tableWrap}>
      <table className={css.table} data-testid={testid}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} aria-sort={c.key === key ? (down ? "descending" : "ascending") : undefined}>
                <button onClick={() => (c.key === key ? setDown(!down) : (setKey(c.key), setDown(!!c.num)))}>
                  {c.label} {c.key === key ? (down ? "↓" : "↑") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key} className={c.num ? css.n : undefined}>
                  {c.show ? c.show(r) : (c.get(r) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
