"use client";

import Link from "next/link";
import { FONT_DISPLAY, FONT_MONO } from "@/lib/theme";
import type { Book } from "@/lib/books";

interface BookWithMeta extends Book {
  count: number;
  cover: string | null;
}

export default function HarvestIndexPage({
  books,
  anthologySlug,
  anthologyTitle,
  anthologyCount,
}: {
  books: BookWithMeta[];
  anthologySlug: string;
  anthologyTitle: string;
  anthologyCount: number;
}) {
  return (
    <>
      <main style={{
        minHeight: "100svh",
        background: "#fff",
        padding: "clamp(80px,12vh,120px) clamp(24px,6vw,80px) 100px",
        boxSizing: "border-box",
      }}>
        {/* Header */}
        <div style={{ maxWidth: 640, marginBottom: "clamp(48px,8vh,80px)" }}>
          <Link href="/" style={{
            fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#bbb", textDecoration: "none",
            display: "block", marginBottom: 32,
          }}>
            ← waituntilmay
          </Link>
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(28px,5vw,52px)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            image harvest
          </h1>
          <p style={{
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em",
            lineHeight: 2, color: "#888",
          }}>
            a growing archive of collective photography. each harvest is a theme — open to public contribution. all harvests accumulate into a single book.
          </p>
        </div>

        {/* Anthology — always first, full-width */}
        <Link href={`/harvest/${anthologySlug}`} style={{ textDecoration: "none", display: "block", marginBottom: "clamp(48px,8vh,72px)" }}>
          <div style={{
            borderTop: "1px solid #000",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb", marginBottom: 10 }}>
                anthology — all harvests
              </p>
              <h2 style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(20px,3.5vw,36px)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#000",
                lineHeight: 1.15,
                marginBottom: 12,
              }}>
                {anthologyTitle}
              </h2>
              <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.12em", color: "#aaa", textTransform: "uppercase" }}>
                {String(anthologyCount).padStart(5, "0")} contributions →
              </p>
            </div>
          </div>
        </Link>

        <div style={{ borderTop: "1px solid #efefef", marginBottom: "clamp(32px,5vh,56px)" }} />

        {/* Individual books grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(clamp(160px,22vw,240px), 1fr))",
          gap: "clamp(32px,5vw,56px) clamp(20px,3vw,40px)",
        }}>
          {books.map((book, i) => (
            <BookCard key={book.slug} book={book} index={i} />
          ))}

          {/* Empty slot — teaser for next book */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.3 }}>
            <div style={{
              aspectRatio: "8.5 / 11",
              background: "#f5f5f5",
              border: "1px dashed #ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
                next harvest
              </p>
            </div>
            <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ccc" }}>
              coming soon
            </p>
          </div>
        </div>
      </main>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wum-logo.png" alt="" className="wum-corner-logo" />
    </>
  );
}

function BookCard({ book, index }: { book: BookWithMeta; index: number }) {
  return (
    <Link href={`/harvest/${book.slug}`} style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}
        onMouseEnter={e => {
          const card = (e.currentTarget as HTMLDivElement).querySelector(".book-cover") as HTMLDivElement;
          if (card) card.style.boxShadow = "0 20px 48px rgba(0,0,0,0.18), -3px 0 8px rgba(0,0,0,0.08)";
        }}
        onMouseLeave={e => {
          const card = (e.currentTarget as HTMLDivElement).querySelector(".book-cover") as HTMLDivElement;
          if (card) card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1), -2px 0 6px rgba(0,0,0,0.06)";
        }}
      >
        {/* Book cover with physical depth */}
        <div className="book-cover" style={{
          aspectRatio: "8.5 / 11",
          background: "#f5f5f5",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1), -2px 0 6px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.3s ease",
        }}>
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover} alt={book.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "#1a1a1a",
              display: "flex", flexDirection: "column",
              justifyContent: "flex-end", padding: 16, boxSizing: "border-box",
            }}>
              <p style={{
                fontFamily: FONT_DISPLAY, fontSize: "clamp(9px,1.2vw,13px)",
                letterSpacing: "0.04em", lineHeight: 1.3,
                textTransform: "uppercase", color: "rgba(255,255,255,0.85)",
              }}>
                {book.title}
              </p>
            </div>
          )}
          {/* Spine shadow */}
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: 10,
            background: "linear-gradient(to right, rgba(0,0,0,0.15), transparent)",
            pointerEvents: "none",
          }} />
          {/* Page-edge shadow */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 4,
            background: "linear-gradient(to left, rgba(0,0,0,0.06), transparent)",
            pointerEvents: "none",
          }} />
          {/* Count badge */}
          <div style={{
            position: "absolute", bottom: 10, right: 10,
            background: "rgba(255,255,255,0.9)",
            padding: "3px 8px",
            fontFamily: FONT_MONO, fontSize: 7,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "#555",
          }}>
            {String(book.count).padStart(5, "0")}
          </div>
        </div>

        <div>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: "clamp(9px,1vw,11px)",
            letterSpacing: "0.1em", textTransform: "uppercase", color: "#000",
            marginBottom: 4,
          }}>
            {book.title}
          </p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.08em", color: "#bbb", lineHeight: 1.6 }}>
            {book.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
