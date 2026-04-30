"use client";

import { useState } from "react";
import Link from "next/link";

const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };

export default function TranscribePage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("loading");
    setText("");
    setError("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setText(data.text);
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={{ ...mono, minHeight: "100vh", background: "#fff", color: "#000", padding: "40px 32px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
        <Link href="/" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", textDecoration: "none" }}>
          waituntilmay
        </Link>
        <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb" }}>
          transcribe
        </span>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="paste any video url — youtube, vimeo, mp4..."
          style={{
            background: "none",
            border: "none",
            borderBottom: "1px solid #e0e0e0",
            padding: "10px 0",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#000",
            outline: "none",
            width: "100%",
            ...mono,
          }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !url.trim()}
          style={{
            background: "none",
            border: "1px solid #000",
            padding: "12px 0",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: status === "loading" ? "wait" : "pointer",
            color: "#000",
            ...mono,
          }}
        >
          {status === "loading" ? "transcribing..." : "transcribe"}
        </button>
      </form>

      {status === "loading" && (
        <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginTop: 32 }}>
          processing — this takes 1–3 minutes depending on length
        </p>
      )}

      {status === "error" && (
        <p style={{ fontSize: 11, color: "#c00", marginTop: 32, letterSpacing: "0.04em" }}>
          {error}
        </p>
      )}

      {status === "done" && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb" }}>transcript</span>
            <button
              onClick={copy}
              style={{ background: "none", border: "none", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", cursor: "pointer", ...mono }}
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <div style={{ borderTop: "1px solid #efefef", paddingTop: 24 }}>
            <p style={{ fontSize: 12, letterSpacing: "0.04em", lineHeight: 2, color: "#333", whiteSpace: "pre-wrap" }}>
              {text}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
