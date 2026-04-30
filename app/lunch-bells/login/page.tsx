"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LunchBellsLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/lunch-bells-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/lunch-bells");
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", width: "260px" }}>
        <p style={{ fontSize: "13px" }}>enter password to continue</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            border: "1px solid #000",
            padding: "6px 8px",
            fontSize: "13px",
            fontFamily: "inherit",
            outline: "none",
            background: "#fff",
          }}
        />
        {error && <p style={{ fontSize: "12px", color: "#c00" }}>incorrect password</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            border: "1px solid #000",
            background: "#000",
            color: "#fff",
            padding: "6px 8px",
            fontSize: "13px",
            fontFamily: "inherit",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "..." : "enter"}
        </button>
      </form>
    </div>
  );
}
