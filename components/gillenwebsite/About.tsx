"use client";
// /gillenwebsite/about: Dylan's information only. The About text large in the header's face at one weight, then
// contact and socials at the interface size.
import { Email } from "./Chrome";
import css from "./site.module.css";

export default function About({ about }: { about: { text: string; instagram: string; contact: string } }) {
  return (
    <section className={css.aboutPage} data-src="19">
      <p className={css.aboutBig} data-about-text>{about.text}</p>
      <div className={css.aboutLinks}>
        {about.contact && <Email addr={about.contact} />}
        {/* SOURCES #28 viscosejournal.com M3: the arrow is typed into the link */}
        <a href={about.instagram} target="_blank" rel="noopener" data-src="28">INSTAGRAM →</a>
      </div>
    </section>
  );
}
