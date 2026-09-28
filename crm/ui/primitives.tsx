"use client";

import { useEffect, useId, useRef, useState } from "react";
import { initials, textOn } from "../lib/colors";
import { STATUS_LABEL, type InterviewType, type Status } from "../lib/types";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

// ─── Icons ─────────────────────────────────────────────────────────────────

const PATHS = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  schedule: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h3v3H8z",
  candidates: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4.5-6.5",
  areas: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5",
  check: "M20 6 9 17l-5-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  rank: "M4 20h4v-7H4zM10 20h4V6h-4zM16 20h4v-10h-4z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ─── Avatar, pills, chips ──────────────────────────────────────────────────

export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-grid flex-none place-items-center rounded-full font-bold"
      style={{ background: color, color: textOn(color), width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium"
      style={{ background: `var(--st-${status})`, color: `var(--st-${status}-ink)` }}
      data-status={status}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function typeStyle(type: InterviewType) {
  return { background: `var(--iv-${type})`, color: `var(--iv-${type}-ink)` };
}

export function Chip({ children, onRemove, removeLabel }: { children: React.ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full border border-(--line) bg-(--card-2) pl-3 pr-1.5 text-[13px] font-medium">
      <span className={onRemove ? "" : "pr-1.5"}>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove"}
          className="grid size-5 place-items-center rounded-full text-(--muted) hover:bg-(--line) hover:text-(--ink)"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("min-w-0 rounded-[22px] border border-(--line) bg-(--card)", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          {title && <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>}
          {action}
        </header>
      )}
      <div className={bodyClassName ?? "px-5 pb-5"}>{children}</div>
    </section>
  );
}

// ─── Buttons & inputs ──────────────────────────────────────────────────────

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-bold transition-colors disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4",
        variant === "primary" && "bg-(--brand) text-white hover:brightness-110",
        variant === "secondary" && "border border-(--line) bg-(--card) hover:bg-(--card-2)",
        variant === "ghost" && "text-(--muted) hover:bg-(--card-2) hover:text-(--ink)",
        className,
      )}
    />
  );
}

export const inputClass =
  "h-10 w-full min-w-0 rounded-xl border border-(--line) bg-(--card) px-3 outline-none placeholder:text-(--muted) focus:border-(--brand)";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[13px] font-medium text-(--muted)">{label}</span>
      {children}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-(--card-2) p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 rounded-lg px-3 text-[13px] font-medium",
            o.value === value ? "bg-(--card) text-(--ink) shadow-[0_1px_2px_rgba(11,9,31,0.08)]" : "text-(--muted) hover:text-(--ink)",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Click-to-edit text. Enter or blur saves, Escape cancels. `display` renders the resting state
 * (e.g. as a link) — clicking the pencil area still edits.
 */
export function InlineField({
  label,
  value,
  onSave,
  placeholder = "Add…",
  display,
  type = "text",
  className,
  inputClassName,
  validate,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  display?: React.ReactNode;
  type?: "text" | "email" | "number" | "url";
  className?: string;
  inputClassName?: string;
  validate?: (v: string) => string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    const v = draft.trim();
    if (v === value) return setEditing(false);
    const err = validate?.(v) ?? null;
    if (err) return setError(err);
    setEditing(false);
    setError(null);
    onSave(v);
  };

  if (editing) {
    return (
      <span className={cx("block min-w-0", className)}>
        <input
          ref={ref}
          type={type}
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(value);
              setError(null);
              setEditing(false);
            }
          }}
          className={cx("h-8 w-full rounded-lg border border-(--brand) bg-(--card) px-2 outline-none", inputClassName)}
        />
        {error && <span className="mt-0.5 block text-[12px] text-(--highlight)">{error}</span>}
      </span>
    );
  }

  return (
    <span className={cx("group flex min-w-0 items-center gap-1", className)}>
      {display && value ? <span className="min-w-0 truncate">{display}</span> : null}
      <button
        type="button"
        aria-label={`Edit ${label.toLowerCase()}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cx(
          "min-w-0 truncate rounded-md px-1 -mx-1 text-left hover:bg-(--card-2)",
          display && value ? "text-(--muted) opacity-0 group-hover:opacity-100 focus:opacity-100 text-[12px]" : "",
          !value && "text-(--muted)",
        )}
      >
        {display && value ? "Edit" : value || placeholder}
      </button>
    </span>
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="crm-backdrop absolute inset-0 bg-[rgba(11,9,31,0.45)]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={id}
        className={cx("crm-drawer relative max-h-[90vh] w-full overflow-y-auto rounded-[22px] border border-(--line) bg-(--card) p-6 shadow-(--shadow)", wide ? "max-w-[1040px] bg-(--canvas)" : "max-w-[560px]")}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={id} className="text-[17px] font-bold">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
