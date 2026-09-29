"use client";

import { useEffect, useId, useState } from "react";
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

/** Sized by CSS (.rail svg 19px, .icon-btn svg 18px, .pill-btn svg 15px…) unless `size` is given. */
export function Icon({ name, size, className }: { name: IconName; size?: number; className?: string }) {
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

export function Avatar({
  name,
  color,
  size = 28,
  radius = "50%",
  className,
}: {
  name: string;
  color: string;
  size?: number;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-grid flex-none place-items-center font-bold", className)}
      style={{ background: color, color: textOn(color), width: size, height: size, borderRadius: radius, fontSize: Math.max(8.5, Math.round(size * 0.36)) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status ${status}`} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Interview-type tint class from the prototype (.blk.pale / .light / .blue / .soft / .mid / .navy). */
export const TYPE_TINT: Record<InterviewType, string> = {
  intro: "pale",
  portfolio: "light",
  technical: "blue",
  ops_case: "soft",
  content_review: "mid",
  final: "navy",
};

export function typeStyle(type: InterviewType) {
  return { background: `var(--iv-${type})`, color: `var(--iv-${type}-ink)` };
}

export function Chip({
  children,
  onRemove,
  removeLabel,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  variant?: "area" | "goal";
  onClick?: () => void;
}) {
  return (
    <span className={cx("chip", variant)} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <span className="one-line">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel ?? "Remove"}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────

/** .card with the prototype's .card-head (h2 17px/700 + .tools). */
export function Card({
  title,
  action,
  children,
  className,
  sub,
  ...rest
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  sub?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cx("card", className)} {...rest}>
      {(title || action) && (
        <div className="card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="wrap-any">{title}</h2>}
            {sub && (
              <div className="sub" style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {sub}
              </div>
            )}
          </div>
          {action && <div className="tools">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ─── Buttons & inputs ──────────────────────────────────────────────────────

/** primary = .btn-accent, secondary = .btn-ghost, black = .btn-black (40px CTA), ghost = .pill-btn. */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "black"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        variant === "primary" && "btn-accent",
        variant === "secondary" && "btn-ghost",
        variant === "black" && "btn-black",
        variant === "ghost" && "pill-btn",
        size === "sm" && (variant === "primary" || variant === "secondary") && "sm",
        "whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

/** input.field / select.field (38px, card-2, radius 10). */
export const inputClass = "field";

/** A label inside the prototype's .form grid; `wide` spans both columns. */
export function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      {children}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = "seg",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(o.value === value && "on", className === "tierctl" && o.value === value && String(o.value))}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Click-to-edit text in the prototype's style (.attr input.txt / .skill input): it reads as plain
 * text until focused. Enter or blur saves, Escape reverts. With `display`, the resting state is a
 * link plus an "edit" control.
 */
export function InlineField({
  label,
  value,
  onSave,
  placeholder = "Add…",
  display,
  type = "text",
  className,
  validate,
  inputClassName = "txt",
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  display?: React.ReactNode;
  type?: "text" | "email" | "number" | "url";
  className?: string;
  validate?: (v: string) => string | null;
  inputClassName?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(value);
  if (!editing && value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  const commit = () => {
    const v = draft.trim();
    if (v === value) return true;
    const err = validate?.(v) ?? null;
    if (err) {
      setError(err);
      return false;
    }
    setError(null);
    onSave(v);
    return true;
  };

  if (display && value && !editing) {
    return (
      <span className={cx("flex min-w-0 items-center gap-1.5", className)}>
        <span className="one-line">{display}</span>
        <button type="button" className="link" style={{ fontSize: 11.5, whiteSpace: "nowrap", flex: "none" }} aria-label={`Edit ${label.toLowerCase()}`} onClick={() => setEditing(true)}>
          edit
        </button>
      </span>
    );
  }

  return (
    <span className={cx("block min-w-0", className)}>
      <input
        className={inputClassName}
        type={type}
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        autoFocus={!!display && editing}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (!commit()) setDraft(value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (commit()) e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setError(null);
            e.currentTarget.blur();
          }
        }}
      />
      {error && <span className="late">{error}</span>}
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
    <div className="modal on">
      <div className="scrim on" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={id}
        className="box"
        style={{ position: "relative", zIndex: 31, ...(wide ? { width: "min(880px, 100%)" } : {}) }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={id}>{title}</h3>
          <button type="button" className="open-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
