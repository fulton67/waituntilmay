"use client";
// /gillenwebsite/about: Dylan's information only. SOURCES #19: his About text large in the header's face at one weight,
// black on white, left-aligned, 56 px (30 px on phones) on 1.05 leading (designbykatalyst.com's studio paragraph),
// set in short lines, a sentence or clause to a line. Each artist named in it who is in the discography is followed
// by a cap-height square of that artist's latest cover (SOURCES #19b). Then contact and socials at the interface
// size. Nothing else.
import { useMemo } from "react";
import type { Release } from "@/lib/gillenwebsite/discography";
import { Email } from "./Chrome";
import Cover from "./Cover";
import css from "./site.module.css";

// the About text's lines (about.json's text, broken by hand: each sentence or clause on its own line, none over 22
// words). If the scraped text ever changes and these no longer join to it, the text is shown as one paragraph.
const LINES = [
  "DYLAN NEUSTADTER is a multi-instrumentalist, producer, and mixer",
  "who came up as Rick Rubin's head engineer.",
  "During his time with Rick,",
  "he worked across everything from Harry Styles, The Strokes, The Red Hot Chili Peppers, Kendrick Lamar, etc.",
  "and since leaving Rick to focus on his own work,",
  "he's recently worked with SZA, Stormzy, Sevdaliza, Teezo Touchdown, Obongjayar, Freak Slug, The Gossip,",
  "Paris Texas, Kwes Darko, Emile Haynie, Orion Sun, Arlo Parks, and Jack Penate.",
];

type Part = string | { name: string; r: Release };

export default function About({ about, releases }: { about: { text: string; instagram: string; contact: string }; releases: Release[] }) {
  // (the scraped text has non-breaking spaces in places; spaces are compared as spaces)
  const text = about.text.replace(/\s+/g, " ");
  const lines = LINES.join(" ") === text ? LINES : [text];
  // every credited artist (split at "," and "&"), with their latest release (discography.json is newest first); in
  // the text a name may carry a leading "The" the credit does not ("The Gossip" for Gossip)
  const parts = useMemo(() => {
    const latest = new Map<string, Release>();
    for (const r of releases) for (const a of r.artist.split(/,|&/).map((x) => x.trim().replace(/^the /i, ""))) if (a && !latest.has(a)) latest.set(a, r);
    const names = [...latest.keys()].sort((a, b) => b.length - a.length).map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(?:The )?(?:${names.join("|")})(?![\\w'])`, "g");
    return lines.map((line) => {
      const out: Part[] = [];
      let at = 0;
      for (const m of line.matchAll(re)) {
        out.push(line.slice(at, m.index!));
        out.push({ name: m[0], r: latest.get(m[0].replace(/^The /, ""))! });
        at = m.index! + m[0].length;
      }
      out.push(line.slice(at));
      return out;
    });
  }, [lines, releases]);

  return (
    <section className={css.aboutPage} data-src="19">
      <p className={css.aboutBig} data-about-text>
        {parts.map((line, k) => (
          <span key={k} className={css.aboutLine}>
            {/* the name and its square never part at a line end */}
            {line.map((p, j) => typeof p === "string" ? p : (
              <span key={j} className={css.aboutName}>{p.name}<Cover r={p.r} className={css.aboutCover} sizes="1em" fixed={512} alt="" /></span>
            ))}
          </span>
        ))}
      </p>
      <div className={css.aboutLinks} data-about-contact>
        {about.contact && <Email addr={about.contact} />}
        {/* SOURCES #28 viscosejournal.com M3: the arrow is typed into the link */}
        <a href={about.instagram} target="_blank" rel="noopener" data-src="28">INSTAGRAM →</a>
      </div>
    </section>
  );
}
