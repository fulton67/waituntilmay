import Link from "next/link";
import { Fragment } from "react";
import css from "../ostad.module.css";
import type { Block } from "../_lib/types";

// Inline markdown: **strong**, *em*, `code`, [text](url). Blocks are parsed at build time.
export function Inline({ s }: { s: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={k++}>{m[2]}</em>);
    else if (m[3]) parts.push(<code key={k++} className={css.mono}>{m[3]}</code>);
    else if (m[4]) {
      const href = m[5];
      parts.push(
        href.startsWith("/") ? (
          <Link key={k++} href={href}>{m[4]}</Link>
        ) : (
          <a key={k++} href={href} target="_blank" rel="noreferrer">{m[4]}</a>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < s.length) parts.push(s.slice(last));
  return <>{parts}</>;
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  let list: Block[] = [];
  const flush = (i: number) => {
    if (list.length) {
      out.push(
        <ul key={`ul${i}`} className={css.prose}>
          {list.map((b, j) => (
            <li key={j}><Inline s={b.s} /></li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  blocks.forEach((b, i) => {
    if (b.t === "li") return void list.push(b);
    flush(i);
    if (b.t === "h2") out.push(<h2 key={i} className={css.h2}><Inline s={b.s} /></h2>);
    else if (b.t === "h3") out.push(<h3 key={i} className={css.h3}><Inline s={b.s} /></h3>);
    else if (b.t === "quote") out.push(<blockquote key={i} className={css.quote}><Inline s={b.s} /></blockquote>);
    else out.push(<p key={i} className={css.p}><Inline s={b.s} /></p>);
  });
  flush(blocks.length);
  return <Fragment>{out}</Fragment>;
}
