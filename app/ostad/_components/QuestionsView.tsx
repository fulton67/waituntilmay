"use client";
import SortTable, { type Col } from "./SortTable";
import type { Question } from "../_lib/types";

const cols: Col<Question>[] = [
  { key: "q", label: "question", get: (r) => r.q },
  { key: "likes", label: "likes", num: true, get: (r) => r.likes },
  { key: "replies", label: "replies", num: true, get: (r) => r.replies },
  { key: "topic", label: "topic", get: (r) => r.topic },
  { key: "service", label: "ostad service", get: (r) => r.service },
  { key: "covered", label: "good video?", get: (r) => r.covered },
  {
    key: "from",
    label: "asked under",
    get: (r) => r.from,
    show: (r) => (
      <a href={r.url} target="_blank" rel="noreferrer">
        {r.from} ↗
      </a>
    ),
  },
];

export default function QuestionsView({ rows }: { rows: Question[] }) {
  return <SortTable rows={rows} cols={cols} initial="likes" testid="questions" />;
}
