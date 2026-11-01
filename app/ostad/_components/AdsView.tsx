"use client";
import SortTable, { type Col } from "./SortTable";
import type { Ad } from "../_lib/types";

const cols: Col<Ad>[] = [
  { key: "days", label: "days running", num: true, get: (r) => r.days ?? -1, show: (r) => r.days ?? "—" },
  { key: "advertiser", label: "advertiser", get: (r) => r.advertiser },
  { key: "headline", label: "headline", get: (r) => r.headline },
  { key: "body", label: "body", get: (r) => r.body, show: (r) => <span style={{ display: "block", maxWidth: "46em" }}>{r.body}</span> },
  { key: "start", label: "started", get: (r) => r.start },
  { key: "platforms", label: "platforms", get: (r) => r.platforms.join(", ") },
  { key: "term", label: "search", get: (r) => r.term },
  {
    key: "link",
    label: "ad",
    get: (r) => r.link,
    show: (r) => (
      <a href={r.link} target="_blank" rel="noreferrer">
        library ↗
      </a>
    ),
  },
];

export default function AdsView({ rows }: { rows: Ad[] }) {
  return <SortTable rows={rows} cols={cols} initial="days" testid="ads" />;
}
