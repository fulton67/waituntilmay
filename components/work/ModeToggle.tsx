"use client";

export type ViewMode = "cloud" | "carousel" | "canvas";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "cloud",    label: "cloud"    },
  { id: "carousel", label: "carousel" },
  { id: "canvas",   label: "canvas"   },
];

export default function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="work-mode-toggle">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`work-mode-btn${mode === m.id ? " active" : ""}`}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
