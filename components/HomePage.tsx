"use client";

import { useState } from "react";
import Image from "next/image";

export default function HomePage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
      className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-10 text-center max-w-sm w-full mx-auto">

        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.jpg" alt="waituntilmay" width={72} height={72} style={{ objectFit: "contain" }} />
          <h1 className="text-xs tracking-widest uppercase">waituntilmay</h1>
          <p className="text-xs tracking-widest text-gray-400 uppercase">image harvest</p>
        </div>

        <div className="w-full border-t border-gray-200" />

        <p className="text-xs tracking-widest text-gray-400 leading-relaxed text-center w-full">
          a collection of photographic work. if you are interested in an image,
          a print, or want to make an inquiry — use the form below.
        </p>

        {status === "sent" ? (
          <p className="text-xs tracking-widest text-gray-400 uppercase">request sent.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <input
              type="text" required placeholder="your name"
              value={name} onChange={e => setName(e.target.value)}
              className="w-full border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors"
            />
            <input
              type="email" required placeholder="your email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors"
            />
            <textarea
              required placeholder="your inquiry" rows={3}
              value={message} onChange={e => setMessage(e.target.value)}
              className="w-full border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full border border-black py-3 px-6 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer bg-transparent text-black mt-2 disabled:opacity-40"
            >
              {status === "sending" ? "sending..." : "send inquiry"}
            </button>
            {status === "error" && (
              <p className="text-xs tracking-widest text-gray-400">something went wrong — try again</p>
            )}
          </form>
        )}

        <a href="/work" className="text-xs tracking-widest text-gray-300 hover:text-black transition-colors uppercase">work →</a>

        <p className="text-xs text-gray-200 tracking-widest">waituntilmay.com</p>

      </div>
    </main>
  );
}
