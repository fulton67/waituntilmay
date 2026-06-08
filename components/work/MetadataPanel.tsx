"use client";

import { AnimatePresence, motion } from "motion/react";

export interface WorkMeta {
  title: string;
  year: string;
  category: string;
  role: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "fine-arts": "fine arts",
  "consulting": "consulting",
};

const ROWS: { key: keyof WorkMeta; label: string }[] = [
  { key: "title",    label: "TITLE"    },
  { key: "year",     label: "YEAR"     },
  { key: "category", label: "CATEGORY" },
  { key: "role",     label: "ROLE"     },
];

export default function MetadataPanel({ meta }: { meta: WorkMeta | null }) {
  return (
    <div className="work-meta" style={{ fontFamily: "\"Courier New\", monospace" }}>
      {ROWS.map(({ key, label }) => {
        const raw = meta?.[key] ?? "—";
        const value = key === "category" ? (CATEGORY_LABELS[raw] ?? raw) : raw || "—";
        return (
          <AnimatePresence mode="wait" key={key}>
            <>
              <span className="work-meta-label">{label}</span>
              <motion.span
                key={value}
                className="work-meta-value"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {value}
              </motion.span>
            </>
          </AnimatePresence>
        );
      })}
    </div>
  );
}
