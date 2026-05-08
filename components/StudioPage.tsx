"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { track } from "@/lib/track";
import { BOOKS, ANTHOLOGY_SLUG, ANTHOLOGY_TITLE } from "@/lib/books";

const PASSWORD = "waituntilmay";
const DOMAIN = "https://waituntilmay.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface SendRecord {
  id: string;
  to: string;
  name: string;
  project: string;
  link: string;
  sentAt: string;
}

interface Schedule {
  project: string;
  releaseDate: string;
  note: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

interface DownloadEvent {
  id: string;
  type: "download";
  project: string;
  name: string | null;
  createdAt: string;
}

// ─── Projects config ──────────────────────────────────────────────────────────

const PROJECTS = [
  { id: "essdee", title: "essdee kid mask", description: "15 images — 8.5×11", baseUrl: "/essdee", pdfLink: "/essdee-kid-mask.pdf", path: (n: string) => `/essdee/${n.toLowerCase()}` },
  { id: "lunch-bells", title: "lunch bells", description: "159 images — 8.5×11", baseUrl: "/lunch-bells", pdfLink: "/lunch-bells.pdf", path: (n: string) => `/lunch-bells/${n.toLowerCase()}` },
];

const ROUTES = [
  { url: "/",             label: "homepage",      description: "inquiry form + image harvest strip" },
  { url: "/work",         label: "work",          description: "gallery swipe + flat list, fine arts first" },
  { url: "/work/boli",    label: "work / boli",   description: "piece page — scroll snap, images + inquiry" },
  { url: "/projects",     label: "projects",      description: "public grid of all collections" },
  { url: "/essdee",       label: "essdee",        description: "download + browse" },
  { url: "/lunch-bells",  label: "lunch bells",   description: "download + browse, 159 pages" },
  { url: "/pixelate",     label: "pixelate",      description: "pixel stretch tool" },
  { url: "/harvest", label: "harvest — library", description: "all image harvests — public index" },
  { url: "/harvest/im-starting-to-become-a-hoarder", label: "harvest — im starting to become a hoarder,", description: "anthology of all harvests" },
  { url: "/studio",       label: "studio",        description: "private backend" },
];

// ─── Local storage hook ───────────────────────────────────────────────────────

function useLS<T>(key: string, init: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(init);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setVal(JSON.parse(s));
    } catch {}
  }, [key]);
  const set = useCallback((v: T) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [val, set];
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<"notifications" | "links" | "contacts" | "history" | "schedule" | "sitemap" | "builder" | "arena" | "artsy" | "metadata" | "analytics" | "work" | "homework" | "books">("notifications");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoaded, setInquiriesLoaded] = useState(false);
  const [downloads, setDownloads] = useState<DownloadEvent[]>([]);
  const [downloadsLoaded, setDownloadsLoaded] = useState(false);

  const [contacts, setContacts] = useLS<Contact[]>("wum_contacts", []);
  const [history, setHistory] = useLS<SendRecord[]>("wum_history", []);
  const [schedules, setSchedules] = useLS<Schedule[]>("wum_schedules", PROJECTS.map(p => ({ project: p.id, releaseDate: "", note: "" })));

  useEffect(() => {
    if (!authed || inquiriesLoaded) return;
    fetch("/api/inquiries")
      .then(r => r.json())
      .then(data => { setInquiries(data); setInquiriesLoaded(true); })
      .catch(() => setInquiriesLoaded(true));
  }, [authed, inquiriesLoaded]);

  useEffect(() => {
    if (!authed || downloadsLoaded) return;
    fetch("/api/notifications")
      .then(r => r.json())
      .then(data => { setDownloads(data); setDownloadsLoaded(true); })
      .catch(() => setDownloadsLoaded(true));
  }, [authed, downloadsLoaded]);

  async function dismissInquiry(id: string) {
    setInquiries(prev => prev.filter(i => i.id !== id));
    await fetch("/api/inquiries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  async function dismissDownload(id: string) {
    setDownloads(prev => prev.filter(d => d.id !== id));
    await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  function approveInquiry(inquiry: Inquiry) {
    const exists = contacts.some(c => c.email === inquiry.email);
    if (!exists) {
      const newContact: Contact = { id: inquiry.id, name: inquiry.name, email: inquiry.email, createdAt: inquiry.createdAt };
      setContacts([...contacts, newContact]);
    }
    dismissInquiry(inquiry.id);
  }

  function addToHistory(record: Omit<SendRecord, "id" | "sentAt">) {
    const entry: SendRecord = { ...record, id: Date.now().toString(), sentAt: new Date().toISOString() };
    setHistory([entry, ...history]);
  }

  if (!authed) {
    return (
      <main style={{ fontFamily: "'Courier New', Courier, monospace" }} className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6">
        <form onSubmit={e => { e.preventDefault(); if (pw === PASSWORD) { setAuthed(true); } else { setPwError(true); setPw(""); } }} className="flex flex-col items-center gap-6 w-full max-w-xs">
          <p className="text-xs tracking-widest uppercase text-gray-400">studio</p>
          <input type="password" autoFocus value={pw} onChange={e => { setPw(e.target.value); setPwError(false); }} placeholder="password"
            className="w-full border-b border-gray-300 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors text-center" />
          {pwError && <p className="text-xs tracking-widest text-gray-400">incorrect</p>}
          <button type="submit" className="w-full border border-black py-3 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors cursor-pointer bg-transparent text-black">enter</button>
        </form>
      </main>
    );
  }

  const TABS = ["notifications", "links", "contacts", "history", "schedule", "sitemap", "builder", "arena", "artsy", "metadata", "analytics", "work", "homework", "books"] as const;

  return (
    <main style={{ fontFamily: "'Courier New', Courier, monospace" }} className="min-h-screen bg-white text-black flex flex-col items-center px-6 py-16">
      <div className="max-w-3xl w-full flex flex-col gap-10">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-lg tracking-widest uppercase">studio</h1>
          <p className="text-xs tracking-widest text-gray-400 mt-1">waituntilmay — backend</p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-6 justify-center border-b border-gray-100 pb-4 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none relative ${tab === t ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>
              {t}
              {t === "notifications" && (inquiries.length + downloads.length) > 0 && (
                <span className="absolute -top-1 -right-3 text-xs text-black font-normal" style={{ fontSize: 9 }}>{inquiries.length + downloads.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "notifications" && <NotificationsTab inquiries={inquiries} downloads={downloads} onApprove={approveInquiry} onDismiss={dismissInquiry} onDismissDownload={dismissDownload} />}
        {tab === "links" && <LinksTab contacts={contacts} onSend={addToHistory} />}
        {tab === "contacts" && <ContactsTab contacts={contacts} setContacts={setContacts} onSend={addToHistory} />}
        {tab === "history" && <HistoryTab history={history} setHistory={setHistory} />}
        {tab === "schedule" && <ScheduleTab schedules={schedules} setSchedules={setSchedules} />}
        {tab === "sitemap" && <SitemapTab />}
        {tab === "builder" && <BuilderTab />}
        {tab === "arena" && <ArenaTab />}
        {tab === "artsy" && <ArtsyTab />}
        {tab === "metadata" && <MetadataTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "work" && <WorkTab />}
        {tab === "homework" && <HomeworkTab />}
        {tab === "books" && <HarvestStudioTab />}
      </div>
    </main>
  );
}

// ─── Notifications tab ───────────────────────────────────────────────────────

function NotificationsTab({ inquiries, downloads, onApprove, onDismiss, onDismissDownload }: {
  inquiries: Inquiry[];
  downloads: DownloadEvent[];
  onApprove: (i: Inquiry) => void;
  onDismiss: (id: string) => void;
  onDismissDownload: (id: string) => void;
}) {
  if (inquiries.length === 0 && downloads.length === 0) {
    return <p className="text-xs tracking-widest text-gray-300 text-center">no new notifications</p>;
  }

  const projectLabel = (id: string) => id === "lunch-bells" ? "lunch bells" : id === "essdee" ? "essdee kid mask" : id;

  return (
    <div className="flex flex-col gap-0">
      {downloads.map(dl => (
        <div key={dl.id} className="flex items-center justify-between gap-4 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <p className="text-xs tracking-widest uppercase text-gray-500">download — {projectLabel(dl.project)}</p>
            {dl.name && <p className="text-xs tracking-widest text-gray-400">{dl.name}</p>}
            <p className="text-xs tracking-widest text-gray-300">{new Date(dl.createdAt).toLocaleDateString()}</p>
          </div>
          <button onClick={() => onDismissDownload(dl.id)}
            className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none shrink-0">
            dismiss
          </button>
        </div>
      ))}
      {inquiries.map(inquiry => (
        <div key={inquiry.id} className="flex flex-col gap-3 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs tracking-widest uppercase">{inquiry.name}</p>
              <p className="text-xs tracking-widest text-gray-400">{inquiry.email}</p>
              <p className="text-xs tracking-widest text-gray-300 mt-1">{new Date(inquiry.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-4 shrink-0">
              <button onClick={() => onApprove(inquiry)}
                className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none text-black">
                add contact
              </button>
              <button onClick={() => onDismiss(inquiry.id)}
                className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none">
                dismiss
              </button>
            </div>
          </div>
          <p className="text-xs tracking-widest text-gray-500 leading-relaxed border-l-2 border-gray-100 pl-3">
            {inquiry.message}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Links tab ────────────────────────────────────────────────────────────────

function LinksTab({ contacts, onSend }: { contacts: Contact[]; onSend: (r: Omit<SendRecord, "id" | "sentAt">) => void }) {
  return (
    <div className="flex flex-col gap-12">
      {PROJECTS.map(p => <ProjectLinkCard key={p.id} project={p} contacts={contacts} onSend={onSend} />)}
    </div>
  );
}

function ProjectLinkCard({ project, contacts, onSend }: { project: typeof PROJECTS[number]; contacts: Contact[]; onSend: (r: Omit<SendRecord, "id" | "sentAt">) => void }) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendEmail, setSendEmail] = useState("");

  const generalLink = `${DOMAIN}${project.baseUrl}`;
  const personalizedLink = name.trim() ? `${DOMAIN}${project.path(name.trim())}` : null;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!sendEmail || !personalizedLink) return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendEmail, name: name.trim(), project: project.id, link: personalizedLink }),
      });
      if (!res.ok) throw new Error();
      track("link_send", { project: project.id, name: name.trim(), to: sendEmail });
      onSend({ to: sendEmail, name: name.trim(), project: project.id, link: personalizedLink });
      setSendStatus("sent");
      setTimeout(() => setSendStatus("idle"), 2000);
    } catch {
      setSendStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm tracking-widest uppercase">{project.title}</h2>
        <p className="text-xs tracking-widest text-gray-400 mt-1">{project.description}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-widest text-gray-400 uppercase">general link</p>
        <div className="flex items-center gap-3">
          <a href={generalLink} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest text-gray-600 flex-1 truncate hover:text-black hover:underline transition-colors">{generalLink}</a>
          <button onClick={() => copy(generalLink, "g")} className="border border-gray-300 px-3 py-1 text-xs tracking-widest uppercase hover:border-black transition-colors cursor-pointer shrink-0">
            {copied === "g" ? "copied" : "copy"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs tracking-widest text-gray-400 uppercase">personalized link</p>
        <input type="text" placeholder="enter name" value={name} onChange={e => setName(e.target.value)}
          className="w-full border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
        {personalizedLink && (
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center gap-3">
              <span className="text-xs tracking-widest text-gray-600 flex-1 truncate">{personalizedLink}</span>
              <button onClick={() => copy(personalizedLink, "p")} className="border border-gray-300 px-3 py-1 text-xs tracking-widest uppercase hover:border-black transition-colors cursor-pointer shrink-0">
                {copied === "p" ? "copied" : "copy"}
              </button>
            </div>
            <form onSubmit={sendLink} className="flex gap-3 items-end">
              <input type="email" required placeholder="send to email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                className="flex-1 border-b border-gray-200 bg-transparent py-1 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
              <button type="submit" disabled={sendStatus === "sending"} className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none disabled:opacity-40">
                {sendStatus === "sending" ? "..." : sendStatus === "sent" ? "sent ✓" : sendStatus === "error" ? "error" : "send"}
              </button>
            </form>
            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {contacts.map(c => (
                  <button key={c.id} onClick={() => setSendEmail(c.email)}
                    className="text-xs tracking-widest text-gray-400 hover:text-black border border-gray-200 px-2 py-1 transition-colors cursor-pointer bg-transparent">
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────────────────────

function ContactsTab({ contacts, setContacts, onSend }: { contacts: Contact[]; setContacts: (c: Contact[]) => void; onSend: (r: Omit<SendRecord, "id" | "sentAt">) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const c: Contact = { id: Date.now().toString(), name: name.trim(), email: email.trim(), createdAt: new Date().toISOString() };
    setContacts([...contacts, c]);
    setName(""); setEmail("");
  }

  function remove(id: string) {
    setContacts(contacts.filter(c => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={add} className="flex flex-col gap-4">
        <p className="text-xs tracking-widest text-gray-400 uppercase">add contact</p>
        <div className="flex gap-4">
          <input type="text" placeholder="name" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
          <input type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)}
            className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
          <button type="submit" className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none">add</button>
        </div>
      </form>

      <div className="border-t border-gray-100" />

      {contacts.length === 0 ? (
        <p className="text-xs tracking-widest text-gray-300">no contacts yet</p>
      ) : (
        <div className="flex flex-col gap-0">
          {contacts.map(c => <ContactRow key={c.id} contact={c} onRemove={() => remove(c.id)} onSend={onSend} />)}
        </div>
      )}
    </div>
  );
}

function ContactRow({ contact, onRemove, onSend }: { contact: Contact; onRemove: () => void; onSend: (r: Omit<SendRecord, "id" | "sentAt">) => void }) {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    const project = PROJECTS.find(p => p.id === projectId)!;
    const link = `${DOMAIN}${project.path(contact.name)}`;
    setStatus("sending");
    try {
      const res = await fetch("/api/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: contact.email, name: contact.name, project: projectId, link }),
      });
      if (!res.ok) throw new Error();
      track("link_send", { project: projectId, name: contact.name, to: contact.email });
      onSend({ to: contact.email, name: contact.name, project: projectId, link });
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-xs tracking-widest">{contact.name}</p>
        <p className="text-xs tracking-widest text-gray-400">{contact.email}</p>
      </div>
      <select value={projectId} onChange={e => setProjectId(e.target.value)}
        className="text-xs tracking-widest border-b border-gray-200 bg-transparent outline-none cursor-pointer py-1">
        {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <button onClick={send} disabled={status === "sending"}
        className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none disabled:opacity-40 shrink-0">
        {status === "sending" ? "..." : status === "sent" ? "sent ✓" : status === "error" ? "error" : "send"}
      </button>
      <button onClick={onRemove} className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none">×</button>
    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

function HistoryTab({ history, setHistory }: { history: SendRecord[]; setHistory: (h: SendRecord[]) => void }) {
  if (history.length === 0) return <p className="text-xs tracking-widest text-gray-300">no sends yet</p>;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-4 pb-2 border-b border-gray-200">
        <p className="text-xs tracking-widest text-gray-400 uppercase flex-1">recipient</p>
        <p className="text-xs tracking-widest text-gray-400 uppercase w-28 hidden sm:block">project</p>
        <p className="text-xs tracking-widest text-gray-400 uppercase w-32 hidden sm:block">date</p>
        <button onClick={() => setHistory([])} className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none ml-auto">clear</button>
      </div>
      {history.map(r => (
        <div key={r.id} className="flex items-start gap-4 py-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs tracking-widest">{r.name}</p>
            <p className="text-xs tracking-widest text-gray-400">{r.to}</p>
            <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest text-gray-300 hover:text-black underline truncate block">{r.link}</a>
          </div>
          <p className="text-xs tracking-widest text-gray-400 w-28 hidden sm:block shrink-0">{r.project}</p>
          <p className="text-xs tracking-widest text-gray-300 w-32 hidden sm:block shrink-0">{new Date(r.sentAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ schedules, setSchedules }: { schedules: Schedule[]; setSchedules: (s: Schedule[]) => void }) {
  function update(project: string, field: keyof Schedule, value: string) {
    setSchedules(schedules.map(s => s.project === project ? { ...s, [field]: value } : s));
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-xs tracking-widest text-gray-400">set release dates and notes per project</p>
      {PROJECTS.map(p => {
        const s = schedules.find(x => x.project === p.id) ?? { project: p.id, releaseDate: "", note: "" };
        return (
          <div key={p.id} className="flex flex-col gap-4">
            <h2 className="text-sm tracking-widest uppercase">{p.title}</h2>
            <div className="flex gap-6 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-40">
                <label className="text-xs tracking-widest text-gray-400 uppercase">release date</label>
                <input type="date" value={s.releaseDate} onChange={e => update(p.id, "releaseDate", e.target.value)}
                  className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none focus:border-black transition-colors" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-40">
                <label className="text-xs tracking-widest text-gray-400 uppercase">note</label>
                <input type="text" placeholder="add a note..." value={s.note} onChange={e => update(p.id, "note", e.target.value)}
                  className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
              </div>
            </div>
            {s.releaseDate && (
              <p className="text-xs tracking-widest text-gray-400">
                {new Date(s.releaseDate) > new Date() ? `releases in ${Math.ceil((new Date(s.releaseDate).getTime() - Date.now()) / 86400000)} days` : "released"}
              </p>
            )}
            <div className="border-t border-gray-100" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Builder tab ─────────────────────────────────────────────────────────────

interface ImageItem { id: string; file: File; url: string; blobUrl?: string; }

const BLANK_BRAND = { name: "", tagline: "", description: "", audience: "", colors: "" };

function BuilderTab() {
  // ── Collection state
  const [items, setItems] = useState<ImageItem[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [format, setFormat] = useState<"download" | "pitch-deck">("download");
  const [brand, setBrand] = useState({ ...BLANK_BRAND });
  const [sprouting, setSprouting] = useState(false);
  const [sproutResult, setSproutResult] = useState<{ url: string } | null>(null);
  const [collections, setCollections] = useState<{ slug: string; title: string; format: string; images: string[] }[]>([]);

  // ── Drag state
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const pointerStart = useRef<{ idx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/collections").then(r => r.json()).then(setCollections).catch(() => {});
  }, [sproutResult]);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).filter(f => f.type.startsWith("image/"))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, url: URL.createObjectURL(f) }));
    setItems(prev => [...prev, ...next]);
    if (!title && next[0]) {
      const base = next[0].file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setTitle(base);
      setSlug(base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  function onPointerDown(e: React.PointerEvent, idx: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStart.current = { idx };
    dragIdx.current = idx; overIdx.current = idx;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointerStart.current) return;
    const cells = containerRef.current?.querySelectorAll("[data-cell]");
    let found: number | null = null;
    cells?.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) found = i;
    });
    if (found !== null && found !== overIdx.current) {
      overIdx.current = found;
      setItems(prev => {
        const arr = [...prev];
        const [item] = arr.splice(dragIdx.current!, 1);
        arr.splice(found!, 0, item);
        dragIdx.current = found!;
        return arr;
      });
    }
  }
  function onPointerUp() { pointerStart.current = null; dragIdx.current = null; overIdx.current = null; }

  async function sprout() {
    if (!items.length || !title.trim() || !slug.trim()) return;
    setSprouting(true);
    try {
      // Upload images to Vercel Blob
      const imageUrls: string[] = [];
      const hasBlobToken = true; // optimistic — API will error if not set
      for (const item of items) {
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("slug", slug);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.error === "no_blob_token") {
          alert("Vercel Blob not set up. Go to Vercel dashboard → Storage → Create Blob Store, connect it to your project, then pull env vars and redeploy.");
          setSprouting(false);
          return;
        }
        if (data.url) imageUrls.push(data.url);
      }

      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, description: brand.description, format, images: imageUrls, brand }),
      });
      const data = await res.json();
      if (data.ok) setSproutResult({ url: data.url });
    } finally { setSprouting(false); }
  }

  async function deleteCollection(s: string) {
    await fetch(`/api/collections/${s}`, { method: "DELETE" });
    setCollections(prev => prev.filter(c => c.slug !== s));
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tools */}
      <div className="flex flex-col gap-3">
        <p className="text-xs tracking-widest text-gray-400 uppercase">tools</p>
        <a href="/pixelate" target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest hover:underline">
          pixelate + pixel stretch →
        </a>
        <a href="/glitch-video" target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest hover:underline">
          video glitch →
        </a>
        <a href="/datamosh" target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest hover:underline">
          datamosh →
        </a>
        <a href="/lab" target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest hover:underline">
          video lab →
        </a>
      </div>

      <div className="flex flex-col gap-6">
          {/* Image upload + reorder */}
          <label className="border border-dashed border-gray-300 py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-500 transition-colors">
            <span className="text-xs tracking-widest text-gray-400 uppercase">drop images or click to upload</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={e => onFiles(e.target.files)} />
          </label>

          {items.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-widest text-gray-300">{items.length} image{items.length !== 1 ? "s" : ""} — hold and drag to reorder</p>
                <button onClick={() => setItems([])} className="text-xs tracking-widest text-gray-300 hover:text-black bg-transparent border-none cursor-pointer">clear</button>
              </div>
              <div ref={containerRef} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                {items.map((item, idx) => (
                  <div key={item.id} data-cell style={{ position: "relative", aspectRatio: "1", background: "#f5f5f5", border: "1px solid #e5e5e5", overflow: "hidden", touchAction: "none", cursor: "grab" }}
                    onPointerDown={e => onPointerDown(e, idx)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                    <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 7, color: "#aaa", fontFamily: "Courier New" }}>{idx + 1}</span>
                    <button onClick={() => setItems(p => p.filter(i => i.id !== item.id))} style={{ position: "absolute", top: 2, right: 3, background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#bbb", lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collection settings */}
          <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
            <p className="text-xs tracking-widest text-gray-400 uppercase">collection</p>
            <div className="flex gap-4">
              <input type="text" placeholder="title" value={title} onChange={e => { setTitle(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }}
                className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
              <input type="text" placeholder="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            </div>
            <div className="flex gap-6">
              {(["download", "pitch-deck"] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${format === f ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>
                  {f === "download" ? "download page" : "pitch deck"}
                </button>
              ))}
            </div>
          </div>

          {/* Brand info */}
          <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
            <p className="text-xs tracking-widest text-gray-400 uppercase">brand info</p>
            {(["name", "tagline", "description", "audience", "colors"] as const).map(k => (
              <input key={k} type="text" placeholder={k} value={brand[k]} onChange={e => setBrand(p => ({ ...p, [k]: e.target.value }))}
                className="w-full border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            ))}
          </div>

          {/* Sprout */}
          {sproutResult ? (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6">
              <p className="text-xs tracking-widest text-gray-500">sprouted →</p>
              <a href={sproutResult.url} target="_blank" rel="noopener noreferrer" className="text-sm tracking-widest underline">waituntilmay.com{sproutResult.url}</a>
              <button onClick={() => { setSproutResult(null); setItems([]); setTitle(""); setSlug(""); setBrand({ ...BLANK_BRAND }); }}
                className="text-xs tracking-widest text-gray-400 hover:text-black bg-transparent border-none cursor-pointer self-start">start new</button>
            </div>
          ) : (
            <button onClick={sprout} disabled={sprouting || !items.length || !slug.trim()}
              className="w-full border border-black py-4 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors cursor-pointer bg-transparent disabled:opacity-30">
              {sprouting ? "uploading & sprouting..." : "sprout collection →"}
            </button>
          )}

          {/* Existing collections */}
          {collections.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6">
              <p className="text-xs tracking-widest text-gray-400 uppercase">live collections</p>
              {collections.map(c => (
                <div key={c.slug} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <a href={`/w/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest hover:underline">{c.title}</a>
                    <p className="text-xs tracking-widest text-gray-300">{c.images.length} images — {c.format}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <a href={`/w/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest text-gray-400 hover:text-black">open</a>
                    <button onClick={() => deleteCollection(c.slug)} className="text-xs tracking-widest text-gray-300 hover:text-black bg-transparent border-none cursor-pointer">delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Are.na tab ───────────────────────────────────────────────────────────────

interface ArenaChannel { id: number; title: string; slug: string; length: number; user: { username: string }; }
interface ArenaBlock { id: number; title: string | null; class: string; image?: { display?: { url: string }; original?: { url: string } }; source?: { url: string }; content?: string; }

function ArenaTab() {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ArenaChannel | null>(null);
  const [blocks, setBlocks] = useState<ArenaBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/arena?path=/search/channels&q=${encodeURIComponent(query)}&per=12`);
      const data = await res.json();
      setChannels(data.channels ?? []);
      setActiveChannel(null);
      setBlocks([]);
    } finally { setLoading(false); }
  }

  async function openChannel(ch: ArenaChannel) {
    setActiveChannel(ch);
    setBlocksLoading(true);
    try {
      const res = await fetch(`/api/arena?path=/channels/${ch.slug}/contents&per=50`);
      const data = await res.json();
      setBlocks(data.contents ?? []);
    } finally { setBlocksLoading(false); }
  }

  const imgUrl = (b: ArenaBlock) => b.image?.display?.url ?? b.image?.original?.url ?? null;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={search} className="flex gap-3 items-end">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="search are.na channels"
          className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
        <button type="submit" disabled={loading} className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none disabled:opacity-40">
          {loading ? "..." : "search"}
        </button>
      </form>

      {activeChannel ? (
        <>
          <div className="flex items-center gap-4">
            <button onClick={() => { setActiveChannel(null); setBlocks([]); }} className="text-xs tracking-widest text-gray-400 hover:text-black bg-transparent border-none cursor-pointer">← back</button>
            <p className="text-xs tracking-widest uppercase">{activeChannel.title}</p>
            <p className="text-xs tracking-widest text-gray-300">{activeChannel.length} blocks</p>
          </div>
          {blocksLoading ? (
            <p className="text-xs tracking-widest text-gray-300">loading...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {blocks.map(b => {
                const url = imgUrl(b);
                return (
                  <div key={b.id} onClick={() => url && setLightbox(url)}
                    style={{ aspectRatio: "1", background: "#f5f5f5", border: "1px solid #e5e5e5", overflow: "hidden", cursor: url ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={b.title ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 9, color: "#bbb", fontFamily: "Courier New", padding: 4, textAlign: "center" }}>{b.class}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-0">
          {channels.length === 0 && !loading && query && (
            <p className="text-xs tracking-widest text-gray-300">no results</p>
          )}
          {channels.map(ch => (
            <div key={ch.id} onClick={() => openChannel(ch)}
              className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer hover:opacity-60 transition-opacity">
              <div>
                <p className="text-xs tracking-widest uppercase">{ch.title}</p>
                <p className="text-xs tracking-widest text-gray-400">{ch.user.username}</p>
              </div>
              <p className="text-xs tracking-widest text-gray-300">{ch.length}</p>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.15em", fontFamily: "Courier New", textTransform: "uppercase", color: "#999" }}>close</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

// ─── Artsy tab (powered by Art Institute of Chicago open API) ─────────────────

interface ArticWork {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  medium_display: string;
  dimensions: string;
  place_of_origin: string;
  style_title: string;
  description: string;
  credit_line: string;
  artwork_type_title: string;
  thumb: string | null;
}

function ArtsyTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArticWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ArticWork | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/artsy?action=search&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally { setLoading(false); }
  }

  async function openArtwork(id: number) {
    const res = await fetch(`/api/artsy?action=artwork&id=${id}`);
    setDetail(await res.json());
  }

  if (detail) {
    const fields: { key: keyof ArticWork; label: string }[] = [
      { key: "artist_display", label: "artist" },
      { key: "date_display", label: "date" },
      { key: "medium_display", label: "medium" },
      { key: "dimensions", label: "dimensions" },
      { key: "place_of_origin", label: "origin" },
      { key: "style_title", label: "style" },
      { key: "artwork_type_title", label: "type" },
      { key: "credit_line", label: "credit" },
    ];
    return (
      <div className="flex flex-col gap-6">
        <button onClick={() => setDetail(null)} className="text-xs tracking-widest text-gray-400 hover:text-black bg-transparent border-none cursor-pointer self-start">← back</button>
        <p className="text-xs tracking-widest uppercase">{detail.title}</p>
        {detail.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detail.thumb} alt={detail.title} style={{ maxWidth: 320, border: "1px solid #e5e5e5" }} />
        )}
        <div className="flex flex-col gap-4">
          {fields.map(({ key, label }) => detail[key] ? (
            <div key={key}>
              <p className="text-xs tracking-widest text-gray-400 uppercase">{label}</p>
              <p className="text-xs tracking-widest mt-1 text-gray-700 leading-relaxed">{String(detail[key])}</p>
            </div>
          ) : null)}
          {detail.description && (
            <div>
              <p className="text-xs tracking-widest text-gray-400 uppercase">description</p>
              <p className="text-xs tracking-widest mt-1 text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: detail.description }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs tracking-widest text-gray-300">art institute of chicago collection</p>
      <form onSubmit={search} className="flex gap-3 items-end">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="search artworks, artists, styles"
          className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
        <button type="submit" disabled={loading} className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none disabled:opacity-40">
          {loading ? "..." : "search"}
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
        {results.map(r => (
          <div key={r.id} onClick={() => openArtwork(r.id)}
            style={{ aspectRatio: "1", background: "#f5f5f5", border: "1px solid #e5e5e5", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {r.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.thumb} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 9, color: "#bbb", fontFamily: "Courier New", padding: 4, textAlign: "center" }}>{r.title}</span>
            )}
          </div>
        ))}
      </div>
      {results.length === 0 && !loading && query && <p className="text-xs tracking-widest text-gray-300">no results</p>}
    </div>
  );
}

// ─── Metadata tab (OpenMetadata-style) ────────────────────────────────────────

const META_FIELDS = ["title", "artist", "year", "medium", "dimensions", "edition", "collection", "tags", "notes"] as const;
type MetaField = typeof META_FIELDS[number];
type MetaRecord = Partial<Record<MetaField, string>>;

const ASSETS = [
  { id: "essdee-kid-mask", label: "essdee kid mask" },
  { id: "lunch-bells", label: "lunch bells" },
];

function parsePrompt(prompt: string): MetaRecord {
  const result: MetaRecord = {};
  const yearMatch = prompt.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) result.year = yearMatch[0];
  const dimMatch = prompt.match(/\b(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
  if (dimMatch) result.dimensions = dimMatch[0].replace(/[xX×]/, " × ");
  const mediums = ["photography", "photo", "film", "digital", "oil", "watercolor", "print", "lithograph", "screen print", "drawing", "collage", "mixed media"];
  const found = mediums.filter(m => prompt.toLowerCase().includes(m));
  if (found.length) result.medium = found.join(", ");
  const editionMatch = prompt.match(/edition\s+of\s+\d+|ed\.?\s+\d+/i);
  if (editionMatch) result.edition = editionMatch[0];
  result.notes = prompt;
  return result;
}

function MetadataTab() {
  const [asset, setAsset] = useState(ASSETS[0].id);
  const [meta, setMeta] = useState<MetaRecord>({});
  const [prompt, setPrompt] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (asset === loaded) return;
    setMeta({});
    setLoaded(null);
    fetch(`/api/metadata?asset=${asset}`)
      .then(r => r.json())
      .then(data => { setMeta(data ?? {}); setLoaded(asset); })
      .catch(() => setLoaded(asset));
  }, [asset, loaded]);

  function applyPrompt() {
    if (!prompt.trim()) return;
    setMeta(prev => ({ ...prev, ...parsePrompt(prompt) }));
    setPrompt("");
  }

  async function save() {
    setSaveStatus("saving");
    await fetch("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset, data: meta }),
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <p className="text-xs tracking-widest text-gray-400 uppercase">asset</p>
        <div className="flex gap-4">
          {ASSETS.map(a => (
            <button key={a.id} onClick={() => { setAsset(a.id); setLoaded(null); }}
              className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${asset === a.id ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs tracking-widest text-gray-400 uppercase">from prompt</p>
        <div className="flex gap-3 items-end">
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyPrompt()}
            placeholder="describe the work — year, medium, dimensions, etc."
            className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
          <button onClick={applyPrompt} className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none">apply</button>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div className="flex flex-col gap-4">
        {META_FIELDS.map(field => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-xs tracking-widest text-gray-400 uppercase">{field}</label>
            {field === "notes" ? (
              <textarea value={meta[field] ?? ""} onChange={e => setMeta(prev => ({ ...prev, [field]: e.target.value }))}
                rows={3}
                className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors resize-none" />
            ) : (
              <input type="text" value={meta[field] ?? ""} onChange={e => setMeta(prev => ({ ...prev, [field]: e.target.value }))}
                className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none focus:border-black transition-colors" />
            )}
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saveStatus === "saving"}
        className="w-full border border-black py-3 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors cursor-pointer bg-transparent disabled:opacity-40">
        {saveStatus === "saving" ? "saving..." : saveStatus === "saved" ? "saved ✓" : "save metadata"}
      </button>
    </div>
  );
}

// ─── Analytics tab ───────────────────────────────────────────────────────────

interface TrackedEvent {
  id: string;
  type: string;
  project: string | null;
  name: string | null;
  action: string | null;
  ip: string;
  ua: string;
  lang: string;
  referer: string | null;
  timezone: string | null;
  screen: string | null;
  device: string | null;
  browser: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  download: "download",
  link_open: "link open",
  link_send: "link sent",
};

function parseUA(ua: string): string {
  if (!ua || ua === "unknown") return "—";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Other";
}

function parseBrowser(ua: string): string {
  if (!ua || ua === "unknown") return "—";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function AnalyticsTab() {
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<TrackedEvent | null>(null);
  const shareUrl = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL;

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  const counts = {
    all: events.length,
    download: events.filter(e => e.type === "download").length,
    link_open: events.filter(e => e.type === "link_open").length,
    link_send: events.filter(e => e.type === "link_send").length,
  };

  return (
    <div className="flex flex-col gap-8">

      {/* Umami embed */}
      {/* Vercel Analytics — always active, zero setup */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest text-gray-400 uppercase">vercel analytics</p>
          <a href="https://vercel.com/fulton67s-projects/waituntilmay/analytics" target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest text-gray-500 hover:text-black underline">open dashboard →</a>
        </div>
        <p className="text-xs tracking-widest text-gray-400 leading-relaxed">page views, visitors, top pages, devices, countries — active on every page now. open the vercel dashboard to see live data.</p>
      </div>

      {shareUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-widest text-gray-400 uppercase">umami dashboard</p>
          <div style={{ position: "relative", width: "100%", paddingBottom: "75%", border: "1px solid #e5e5e5", overflow: "hidden", background: "#fafafa" }}>
            <iframe src={shareUrl} title="analytics" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border border-dashed border-gray-200 p-5">
          <p className="text-xs tracking-widest text-gray-500 uppercase">connect umami for behavioral analytics</p>
          <div className="flex flex-col gap-2 text-xs tracking-widest text-gray-400 leading-relaxed">
            <p>once you have your umami account, paste the 3 values into the terminal:</p>
            <pre style={{ fontSize: 9, background: "#f5f5f5", padding: "10px 12px", lineHeight: 1.8, color: "#555" }}>{`npx vercel env add NEXT_PUBLIC_UMAMI_SCRIPT_URL
npx vercel env add NEXT_PUBLIC_UMAMI_WEBSITE_ID
npx vercel env add NEXT_PUBLIC_UMAMI_SHARE_URL
npx vercel --prod`}</pre>
          </div>
        </div>
      )}

      {/* Raw event log */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest text-gray-400 uppercase">event log</p>
          <div className="flex gap-4">
            {(["all", "link_open", "download", "link_send"] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none ${filter === t ? "text-black underline underline-offset-4" : "text-gray-400 hover:text-gray-600"}`}>
                {t === "all" ? `all (${counts.all})` : `${TYPE_LABELS[t]} (${counts[t]})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-xs tracking-widest text-gray-300">loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs tracking-widest text-gray-300">no events yet</p>
        ) : (
          <div className="flex flex-col gap-0">
            {filtered.map(ev => (
              <div key={ev.id} onClick={() => setDetail(detail?.id === ev.id ? null : ev)}
                className="flex items-center gap-4 py-3 border-b border-gray-100 cursor-pointer hover:opacity-70 transition-opacity">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs tracking-widest uppercase text-gray-600">{TYPE_LABELS[ev.type] ?? ev.type}</span>
                    {ev.project && <span className="text-xs tracking-widest text-gray-400">{ev.project}</span>}
                    {ev.name && <span className="text-xs tracking-widest text-gray-500">{ev.name}</span>}
                  </div>
                  {detail?.id === ev.id && (
                    <div className="mt-3 flex flex-col gap-2 text-xs tracking-widest">
                      {[
                        ["device", parseUA(ev.ua)],
                        ["browser", parseBrowser(ev.ua)],
                        ["language", ev.lang],
                        ["timezone", ev.timezone],
                        ["screen", ev.screen],
                        ["ip", ev.ip],
                        ["referer", ev.referer],
                      ].map(([label, val]) => val && val !== "unknown" && val !== "—" ? (
                        <div key={label} className="flex gap-3">
                          <span className="text-gray-400 w-20 shrink-0">{label}</span>
                          <span className="text-gray-600 break-all">{val}</span>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>
                <span className="text-xs tracking-widest text-gray-300 shrink-0">{new Date(ev.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sitemap tab ──────────────────────────────────────────────────────────────

function SitemapTab() {
  const [cols, setCols] = useState<1 | 2>(2);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-widest text-gray-400">live previews — all routes</p>
        <div className="flex gap-2">
          {([1, 2] as const).map(n => (
            <button
              key={n}
              onClick={() => setCols(n)}
              className={`text-xs tracking-widest uppercase cursor-pointer bg-transparent border px-3 py-1 ${cols === n ? "border-black text-black" : "border-gray-200 text-gray-400 hover:text-black"}`}
            >
              {n === 1 ? "stack" : "side by side"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "16px" }}>
        {ROUTES.map(r => (
          <div key={r.url} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <a href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-xs tracking-widest uppercase hover:underline">{r.label}</a>
              <span className="text-xs tracking-widest text-gray-300">{r.description}</span>
            </div>
            <div style={{ position: "relative", width: "100%", paddingBottom: "60%", border: "1px solid #e5e5e5", overflow: "hidden", background: "#fafafa" }}>
              <iframe
                src={r.url}
                title={r.label}
                sandbox="allow-scripts allow-same-origin"
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: cols === 1 ? "200%" : "300%",
                  height: cols === 1 ? "200%" : "300%",
                  transform: cols === 1 ? "scale(0.5)" : "scale(0.333)",
                  transformOrigin: "top left",
                  border: "none", pointerEvents: "none",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Work tab ─────────────────────────────────────────────────────────────────

interface WorkItem {
  id: string;
  title: string;
  role: string;
  year: string;
  category: "clothing-production" | "movies-video" | "fine-arts" | "consulting";
  visible: boolean;
  image?: string;
  video?: string;
  preface?: boolean;
  bio?: string;
  slug?: string;
  listed?: boolean;
}

const WORK_CATEGORIES: { id: WorkItem["category"]; label: string }[] = [
  { id: "clothing-production", label: "clothing production" },
  { id: "movies-video", label: "movies & video" },
  { id: "fine-arts", label: "fine arts" },
  { id: "consulting", label: "consulting" },
];

const CATEGORY_LABELS: Record<string, string> = {
  "clothing-production": "clothing production",
  "movies-video": "movies & video",
  "fine-arts": "fine arts",
  "consulting": "consulting",
};

const BLANK_WORK: Omit<WorkItem, "id"> = { title: "", role: "", year: "", category: "clothing-production", visible: true, listed: true, image: "", bio: "" };

function itemSlug(item: WorkItem): string {
  if (item.slug) return item.slug;
  const base = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base ? `${base}-${item.id}` : item.id;
}

function MediaDropZone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const blob = await upload(
        `work/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        file,
        { access: "public", handleUploadUrl: "/api/upload", multipart: true }
      );
      onChange(blob.url);
    } catch (err) {
      alert(`upload failed: ${err}`);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isVideo = value && (value.includes(".mp4") || value.includes(".mov") || value.includes(".MOV") || value.includes(".webm"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragging ? "#000" : "#ddd"}`,
          borderRadius: 2,
          padding: "14px 12px",
          cursor: uploading ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          transition: "border-color 0.15s",
        }}
      >
        {value && !isVideo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: 48, height: 48, objectFit: "cover", flexShrink: 0 }} />
        ) : value && isVideo ? (
          <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "#999" }}>video</span>
        ) : null}
        <span style={{ fontSize: 10, letterSpacing: "0.12em", color: uploading ? "#aaa" : "#bbb" }}>
          {uploading ? "uploading..." : value ? "drop to replace" : "drop image or video, or click to upload"}
        </span>
        <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      <input
        className="border-b border-gray-200 bg-transparent py-1 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors w-full"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="or paste url"
      />
    </div>
  );
}

function WorkTab() {
  const [items, setItems]   = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [form, setForm]       = useState<Omit<WorkItem, "id">>({ ...BLANK_WORK });
  const [adding, setAdding]   = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragId, setDragId]   = useState<string | null>(null);
  const [overId, setOverId]   = useState<string | null>(null);
  const wasDragging           = useRef(false);

  useEffect(() => {
    fetch("/api/work").then(r => r.json()).then(data => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function saveAll(updated: WorkItem[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_all", items: updated }) });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("save failed — please try again");
      // Refetch to get back to known state
      fetch("/api/work").then(r => r.json()).then(setItems).catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    wasDragging.current = true;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== overId) setOverId(id);
  }
  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const updated = [...items];
    const from = updated.findIndex(i => i.id === dragId);
    const to   = updated.findIndex(i => i.id === targetId);
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setItems(updated);
    saveAll(updated);
    setDragId(null); setOverId(null);
  }
  function onDragEnd() { setDragId(null); setOverId(null); setTimeout(() => { wasDragging.current = false; }, 50); }

  function toggle(id: string, field: "visible" | "listed") {
    const updated = items.map(i => i.id === id ? { ...i, [field]: !i[field] } : i);
    setItems(updated); saveAll(updated);
  }

  function remove(id: string) {
    if (!confirm("Remove this piece?")) return;
    const updated = items.filter(i => i.id !== id);
    setItems(updated); saveAll(updated);
  }

  function startEdit(item: WorkItem) {
    setEditId(item.id);
    setForm({ title: item.title, role: item.role ?? "", year: item.year ?? "", category: item.category, visible: item.visible, listed: item.listed ?? true, image: item.image ?? "", video: item.video ?? "", bio: item.bio ?? "", slug: item.slug ?? "" });
    setAdding(false);
  }

  function saveEdit() {
    const updated = items.map(i => i.id === editId ? { ...i, ...form } : i);
    setItems(updated); setEditId(null); saveAll(updated);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch("/api/work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: form }) });
    const data = await res.json();
    if (data.item) setItems(prev => [...prev, data.item]);
    setForm({ ...BLANK_WORK }); setAdding(false);
  }

  async function copyPieceLink(item: WorkItem) {
    const url = `https://waituntilmay.com/work/${itemSlug(item)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const inputCls = "border-b border-gray-200 bg-transparent py-1 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors w-full";

  if (loading) return <p className="text-xs tracking-widest text-gray-300">loading...</p>;

  function renderEditPanel(onDone: () => void, isNew = false) {
    return (
      <div style={{ borderTop: "2px solid #000", padding: "20px 0 8px", marginTop: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>image</p>
            <MediaDropZone value={form.image ?? ""} onChange={url => setForm(p => ({ ...p, image: url }))} />
          </div>
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>video</p>
            <input className={inputCls} value={form.video ?? ""} onChange={e => setForm(p => ({ ...p, video: e.target.value }))} placeholder="paste video url" />
            {form.video && (
              <video src={form.video} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", marginTop: 8, background: "#f5f5f5" }} muted playsInline />
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 12, marginBottom: 12 }}>
          <input className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="title" />
          <input className={inputCls} value={form.role ?? ""} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="role / medium" />
          <input className={inputCls} value={form.year ?? ""} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} placeholder="year" />
        </div>

        <textarea
          className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors w-full resize-none"
          rows={3}
          value={form.bio ?? ""}
          onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
          placeholder="artist statement"
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <select className="text-xs tracking-widest border-b border-gray-200 bg-transparent outline-none cursor-pointer py-1" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as WorkItem["category"] }))}>
            {WORK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className="border-b border-gray-200 bg-transparent py-1 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black" style={{ width: 160 }} value={form.slug ?? ""} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="custom slug (optional)" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={form.visible} onChange={e => setForm(p => ({ ...p, visible: e.target.checked }))} />
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555" }}>visible</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={form.listed ?? true} onChange={e => setForm(p => ({ ...p, listed: e.target.checked }))} />
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555" }}>public listing</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => isNew ? addItem({ preventDefault: () => {} } as React.FormEvent) : saveEdit()}
            style={{ background: "#000", color: "#fff", border: "none", padding: "10px 24px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {saving ? "saving..." : isNew ? "add" : "save"}
          </button>
          {!isNew && editId && (
            <button
              onClick={() => copyPieceLink(items.find(i => i.id === editId)!)}
              style={{ background: "none", border: "1px solid #e0e0e0", padding: "10px 16px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", color: "#666" }}
            >
              {copiedId === editId ? "copied ✓" : "copy link"}
            </button>
          )}
          <button onClick={onDone} style={{ background: "none", border: "none", fontSize: 10, letterSpacing: "0.12em", color: "#bbb", cursor: "pointer", marginLeft: "auto" }}>cancel</button>
          {!isNew && editId && (
            <button onClick={() => { remove(editId); onDone(); }} style={{ background: "none", border: "none", fontSize: 10, letterSpacing: "0.12em", color: "#ddd", cursor: "pointer" }}>delete</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#aaa" }}>{items.length} pieces</p>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#bbb" }}>{saving ? "saving..." : saved ? "saved" : ""}</span>
          <a href="/work" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999" }}>view →</a>
          <button
            onClick={() => { setAdding(!adding); setEditId(null); setForm({ ...BLANK_WORK }); }}
            style={{ background: adding ? "#000" : "none", color: adding ? "#fff" : "#000", border: "1px solid #000", padding: "6px 14px", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}
          >
            + add piece
          </button>
        </div>
      </div>

      {/* Add new panel */}
      {adding && renderEditPanel(() => setAdding(false), true)}

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
        {items.map(item => {
          const isSelected = editId === item.id;
          const thumb = item.image || null;
          const hasVideo = !!item.video && !item.image;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={e => onDragStart(e, item.id)}
              onDragOver={e => onDragOver(e, item.id)}
              onDrop={e => onDrop(e, item.id)}
              onDragEnd={onDragEnd}
              onClick={() => { if (wasDragging.current) return; setAdding(false); startEdit(item); }}
              style={{
                opacity: dragId === item.id ? 0.2 : item.visible ? 1 : 0.4,
                outline: overId === item.id && dragId !== item.id ? "2px solid #000" : "none",
                border: isSelected ? "2px solid #000" : "1px solid #e8e8e8",
                background: "#f8f8f8",
                cursor: "pointer",
              }}
            >
              <div style={{ aspectRatio: "4/3", background: "#ececec", overflow: "hidden", position: "relative" }}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={item.title} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : hasVideo ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 22, color: "#bbb" }}>▶</span>
                  </div>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: "#ccc", letterSpacing: "0.1em" }}>no image</span>
                  </div>
                )}
                {!item.visible && <span style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", padding: "2px 5px" }}>hidden</span>}
                {!(item.listed ?? true) && item.visible && <span style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.25)", color: "#fff", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 5px" }}>link only</span>}
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <p style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginBottom: 2 }}>{CATEGORY_LABELS[item.category]}{item.year ? ` · ${item.year}` : ""}</p>
                <p style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.4 }}>{item.title || "untitled"}</p>
                {item.role && <p style={{ fontSize: 9, color: "#aaa", marginTop: 1 }}>{item.role}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit panel — full width below grid */}
      {editId && renderEditPanel(() => setEditId(null))}

    </div>
  );
}

// ─── Homework tab ─────────────────────────────────────────────────────────────

interface HomeworkItem {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: "pending" | "in-progress" | "done";
  notes: string;
  createdAt: string;
}

const STATUS_LABELS: Record<HomeworkItem["status"], string> = {
  pending: "pending",
  "in-progress": "in progress",
  done: "done",
};

const BLANK_HW: Omit<HomeworkItem, "id" | "createdAt"> = { title: "", course: "", dueDate: "", status: "pending", notes: "" };

function HomeworkTab() {
  const [items, setItems]         = useState<HomeworkItem[]>([]);
  const [creds, setCreds]         = useState({ email: "", password: "" });
  const [loading, setLoading]     = useState(true);
  const [credsSaved, setCredsSaved] = useState(false);
  const [form, setForm]           = useState({ ...BLANK_HW });
  const [adding, setAdding]       = useState(false);
  const [showPw, setShowPw]       = useState(false);

  useEffect(() => {
    fetch("/api/homework")
      .then(r => r.json())
      .then(d => { setItems(d.homework ?? []); setCreds(d.creds ?? { email: "", password: "" }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function saveCreds(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/homework", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_creds", ...creds }) });
    setCredsSaved(true);
    setTimeout(() => setCredsSaved(false), 2000);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch("/api/homework", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: form }) });
    const data = await res.json();
    if (data.item) setItems(prev => [data.item, ...prev]);
    setForm({ ...BLANK_HW });
    setAdding(false);
  }

  async function updateStatus(item: HomeworkItem, status: HomeworkItem["status"]) {
    const updated = { ...item, status };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    await fetch("/api/homework", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", item: updated }) });
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch("/api/homework", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
  }

  if (loading) return <p className="text-xs tracking-widest text-gray-300">loading...</p>;

  const pending    = items.filter(i => i.status !== "done");
  const done       = items.filter(i => i.status === "done");

  return (
    <div className="flex flex-col gap-10">

      {/* Extension setup */}
      <div className="flex flex-col gap-4">
        <p className="text-xs tracking-widest text-gray-400 uppercase">auto-mcgraw extension</p>
        <p className="text-xs tracking-widest text-gray-500 leading-relaxed">
          auto-mcgraw runs in chrome as an extension — it reads questions from your smartbook and sends them to chatgpt, gemini, or deepseek, then fills in the answers automatically.
        </p>
        <div className="flex flex-col gap-2 text-xs tracking-widest text-gray-400 leading-loose">
          <p>1. download the latest zip from github releases</p>
          <p>2. go to chrome://extensions → enable developer mode</p>
          <p>3. click "load unpacked" → select the extracted folder</p>
          <p>4. open a smartbook assignment — the "ask ai" button will appear in the header</p>
        </div>
        <div className="flex gap-4">
          <a href="https://github.com/GooglyBlox/auto-mcgraw/releases" target="_blank" rel="noopener noreferrer"
            className="border border-black px-4 py-2 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors">
            download extension →
          </a>
          <a href="https://learning.mheducation.com" target="_blank" rel="noopener noreferrer"
            className="text-xs tracking-widest text-gray-400 hover:text-black underline uppercase self-center">
            open mcgraw →
          </a>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* McGraw credentials */}
      <div className="flex flex-col gap-4">
        <p className="text-xs tracking-widest text-gray-400 uppercase">mcgraw credentials</p>
        <form onSubmit={saveCreds} className="flex flex-col gap-3">
          <input type="email" placeholder="email" value={creds.email} onChange={e => setCreds(p => ({ ...p, email: e.target.value }))}
            className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
          <div className="flex items-center gap-3">
            <input type={showPw ? "text" : "password"} placeholder="password" value={creds.password} onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
              className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            <button type="button" onClick={() => setShowPw(p => !p)} className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none">
              {showPw ? "hide" : "show"}
            </button>
          </div>
          <button type="submit" className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none self-start text-gray-500 hover:text-black transition-colors">
            {credsSaved ? "saved ✓" : "save"}
          </button>
        </form>
      </div>

      <div className="border-t border-gray-100" />

      {/* Assignment tracker */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest text-gray-400 uppercase">assignments</p>
          <button onClick={() => setAdding(p => !p)} className="text-xs tracking-widest uppercase cursor-pointer bg-transparent border-none text-gray-400 hover:text-black transition-colors">
            {adding ? "cancel" : "+ add"}
          </button>
        </div>

        {adding && (
          <form onSubmit={addItem} className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <input type="text" placeholder="assignment title" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            <input type="text" placeholder="course" value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
              className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            <div className="flex gap-4">
              <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                className="flex-1 border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none focus:border-black transition-colors" />
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as HomeworkItem["status"] }))}
                className="text-xs tracking-widest border-b border-gray-200 bg-transparent outline-none cursor-pointer py-2">
                {(Object.keys(STATUS_LABELS) as HomeworkItem["status"][]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <input type="text" placeholder="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="border-b border-gray-200 bg-transparent py-2 text-xs tracking-widest outline-none placeholder-gray-300 focus:border-black transition-colors" />
            <button type="submit" className="text-xs tracking-widest uppercase hover:underline cursor-pointer bg-transparent border-none self-start">add assignment</button>
          </form>
        )}

        {pending.length === 0 && !adding && (
          <p className="text-xs tracking-widest text-gray-200">no pending assignments</p>
        )}

        {pending.map(item => <HomeworkRow key={item.id} item={item} onStatus={updateStatus} onDelete={deleteItem} />)}

        {done.length > 0 && (
          <>
            <p className="text-xs tracking-widest text-gray-200 uppercase mt-4">completed</p>
            {done.map(item => <HomeworkRow key={item.id} item={item} onStatus={updateStatus} onDelete={deleteItem} />)}
          </>
        )}
      </div>

    </div>
  );
}

function HomeworkRow({ item, onStatus, onDelete }: { item: HomeworkItem; onStatus: (i: HomeworkItem, s: HomeworkItem["status"]) => void; onDelete: (id: string) => void }) {
  const isDone = item.status === "done";
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-gray-100" style={{ opacity: isDone ? 0.4 : 1 }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs tracking-widest uppercase" style={{ textDecoration: isDone ? "line-through" : "none" }}>{item.title}</p>
          {item.course && <p className="text-xs tracking-widest text-gray-400">{item.course}</p>}
          {item.dueDate && <p className="text-xs tracking-widest text-gray-300">due {new Date(item.dueDate + "T12:00:00").toLocaleDateString()}</p>}
          {item.notes && <p className="text-xs tracking-widest text-gray-400 leading-relaxed">{item.notes}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select value={item.status} onChange={e => onStatus(item, e.target.value as HomeworkItem["status"])}
            className="text-xs tracking-widest border-b border-gray-200 bg-transparent outline-none cursor-pointer py-1 text-gray-400">
            {(Object.keys(STATUS_LABELS) as HomeworkItem["status"][]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button onClick={() => onDelete(item.id)} className="text-xs tracking-widest text-gray-300 hover:text-black cursor-pointer bg-transparent border-none">×</button>
        </div>
      </div>
    </div>
  );
}

// ─── Harvest studio tab ───────────────────────────────────────────────────────

interface HarvestSub {
  id: string;
  theme: string;
  name: string;
  images: string[];
  submittedAt: string;
  visible: boolean;
}

async function imgToJpegBytes(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = el.naturalWidth;
      canvas.height = el.naturalHeight;
      canvas.getContext("2d")!.drawImage(el, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error("canvas blob failed"));
        blob.arrayBuffer().then(resolve).catch(reject);
      }, "image/jpeg", 0.92);
    };
    el.onerror = reject;
    el.src = url;
  });
}

// ─── Book viewer ─────────────────────────────────────────────────────────────

const BOOK_MONO = "'Courier New', Courier, monospace";
const PAGE_W = 210;
const PAGE_H = 272; // 8.5:11 ratio

function BookViewer({ subs, title, subtitle }: { subs: HarvestSub[]; title: string; subtitle?: string }) {
  const [spread, setSpread] = useState(-1); // -1 = cover
  const [animDir, setAnimDir] = useState<"fwd" | "back" | null>(null);
  const visible = subs.filter(s => s.visible !== false);
  const totalSpreads = Math.ceil(visible.length / 2);

  function go(dir: "fwd" | "back") {
    const next = dir === "fwd" ? spread + 1 : spread - 1;
    if (next < -1 || next >= totalSpreads) return;
    setAnimDir(dir);
    setTimeout(() => { setSpread(next); setAnimDir(null); }, 240);
  }

  const leftIdx  = spread === -1 ? -1 : spread * 2;
  const rightIdx = leftIdx + 1;
  const leftSub  = leftIdx >= 0 ? visible[leftIdx]  : null;
  const rightSub = rightIdx >= 0 ? visible[rightIdx] : null;

  const contentOpacity  = animDir ? 0 : 1;
  const bookTransform   = animDir === "fwd"
    ? "perspective(900px) rotateY(-5deg) scale(0.98)"
    : animDir === "back"
    ? "perspective(900px) rotateY(5deg) scale(0.98)"
    : "perspective(900px) rotateY(0deg) scale(1)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "32px 0 16px" }}>
      <div style={{ position: "relative" }}>
        {/* Book thickness — stacked page edges */}
        {[6, 4, 2].map(offset => (
          <div key={offset} style={{
            position: "absolute",
            left: -offset, top: offset * 0.6,
            width: PAGE_W * 2,
            height: PAGE_H,
            background: offset === 6 ? "#e2ddd8" : offset === 4 ? "#ede9e4" : "#f4f1ee",
            boxShadow: "inset -2px 0 4px rgba(0,0,0,0.06)",
            borderRadius: 1,
          }} />
        ))}

        {/* Main spread */}
        <div style={{
          position: "relative",
          display: "flex",
          width: PAGE_W * 2,
          height: PAGE_H,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 6px 18px rgba(0,0,0,0.12), -4px 0 12px rgba(0,0,0,0.08)",
          transform: bookTransform,
          transition: "transform 0.24s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}>
          {/* Left page */}
          <div style={{
            width: PAGE_W, height: PAGE_H,
            background: spread === -1 ? "#161614" : "#faf8f5",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {spread === -1 ? (
              <div style={{
                padding: 20, height: "100%", boxSizing: "border-box",
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
                color: "#fff",
              }}>
                <p style={{
                  fontFamily: BOOK_MONO, fontSize: 11, letterSpacing: "0.04em",
                  lineHeight: 1.4, textTransform: "lowercase", color: "rgba(255,255,255,0.9)",
                  maxWidth: 160,
                }}>
                  {title}
                </p>
                <p style={{ fontFamily: BOOK_MONO, fontSize: 7, letterSpacing: "0.16em", marginTop: 14, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
                  waituntilmay
                </p>
              </div>
            ) : leftSub ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leftSub.images[0]} alt={leftSub.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                  opacity: contentOpacity, transition: "opacity 0.24s ease" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#f0ece6" }} />
            )}
            {/* Left-page inner shadow (spine side) */}
            <div style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: 28,
              background: "linear-gradient(to right, transparent, rgba(0,0,0,0.09))",
              pointerEvents: "none",
            }} />
            {/* Left-page outer edge shadow */}
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: 0, width: 6,
              background: "linear-gradient(to right, rgba(0,0,0,0.1), transparent)",
              pointerEvents: "none",
            }} />
          </div>

          {/* Spine gutter */}
          <div style={{
            position: "absolute", left: PAGE_W - 1, top: 0, bottom: 0, width: 2, zIndex: 2,
            background: "linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0.04))",
            pointerEvents: "none",
          }} />

          {/* Right page */}
          <div style={{
            width: PAGE_W, height: PAGE_H,
            background: "#faf8f5",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {spread === -1 ? (
              <div style={{
                padding: 20, height: "100%", boxSizing: "border-box",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <p style={{ fontFamily: BOOK_MONO, fontSize: 7, letterSpacing: "0.12em", lineHeight: 2.4, color: "#b0ab9e", textTransform: "uppercase" }}>
                  image harvest<br />
                  {subtitle ?? title}<br />
                  {visible.length} contributions
                </p>
              </div>
            ) : rightSub ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rightSub.images[0]} alt={rightSub.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                  opacity: contentOpacity, transition: "opacity 0.24s ease" }} />
            ) : null}
            {/* Right-page inner shadow (spine side) */}
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: 28,
              background: "linear-gradient(to left, transparent, rgba(0,0,0,0.06))",
              pointerEvents: "none",
            }} />
            {/* Right-page outer edge shadow */}
            <div style={{
              position: "absolute", top: 0, bottom: 0, right: 0, width: 6,
              background: "linear-gradient(to left, rgba(0,0,0,0.07), transparent)",
              pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* Page labels */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          paddingTop: 10, width: PAGE_W * 2,
          fontFamily: BOOK_MONO, fontSize: 7, letterSpacing: "0.1em", color: "#b0ab9e",
          textTransform: "uppercase",
          opacity: contentOpacity, transition: "opacity 0.24s ease",
        }}>
          <span style={{ maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {spread === -1 ? "" : leftSub?.name ?? ""}
          </span>
          <span style={{ color: "#ccc" }}>
            {spread === -1 ? "cover" : `${spread * 2 + 1}${rightSub ? `–${spread * 2 + 2}` : ""} / ${visible.length}`}
          </span>
          <span style={{ maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {spread === -1 ? "" : rightSub?.name ?? ""}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <button onClick={() => go("back")} disabled={spread === -1}
          style={{
            background: "none", border: "none", fontFamily: BOOK_MONO, fontSize: 8,
            letterSpacing: "0.16em", textTransform: "uppercase", cursor: spread === -1 ? "default" : "pointer",
            color: spread === -1 ? "#ddd" : "#999", padding: 0,
          }}>← prev</button>
        <span style={{ fontFamily: BOOK_MONO, fontSize: 7, letterSpacing: "0.12em", color: "#ccc" }}>
          {spread === -1 ? "cover" : `${spread + 1} / ${totalSpreads}`}
        </span>
        <button onClick={() => go("fwd")} disabled={spread >= totalSpreads - 1}
          style={{
            background: "none", border: "none", fontFamily: BOOK_MONO, fontSize: 8,
            letterSpacing: "0.16em", textTransform: "uppercase",
            cursor: spread >= totalSpreads - 1 ? "default" : "pointer",
            color: spread >= totalSpreads - 1 ? "#ddd" : "#999", padding: 0,
          }}>next →</button>
      </div>
    </div>
  );
}

// ─── Single harvest book panel ────────────────────────────────────────────────

function HarvestBook({
  themes, title, publicUrl,
}: {
  themes: string[];
  title: string;
  publicUrl?: string;
}) {
  const [subs, setSubs]           = useState<HarvestSub[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "building" | "done">("idle");
  const [toggling, setToggling]   = useState<string | null>(null);
  const [view, setView]           = useState<"book" | "grid">("book");
  const primaryTheme              = themes[0];

  useEffect(() => {
    Promise.all(
      themes.map(t =>
        fetch(`/api/harvest/submissions?theme=${t}`)
          .then(r => r.json())
          .catch(() => [] as HarvestSub[])
      )
    ).then(results => {
      const seen = new Set<string>();
      const merged: HarvestSub[] = [];
      for (const batch of results) {
        for (const sub of batch as HarvestSub[]) {
          if (!seen.has(sub.id)) { seen.add(sub.id); merged.push(sub); }
        }
      }
      merged.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      setSubs(merged);
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes.join(",")]);

  async function toggleVisible(sub: HarvestSub) {
    setToggling(sub.id);
    await fetch("/api/harvest/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: sub.theme || primaryTheme, id: sub.id, visible: !sub.visible }),
    });
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, visible: !s.visible } : s));
    setToggling(null);
  }

  async function remove(sub: HarvestSub) {
    if (!confirm(`Remove ${sub.name}'s submission?`)) return;
    await fetch("/api/harvest/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: sub.theme || primaryTheme, id: sub.id }),
    });
    setSubs(prev => prev.filter(s => s.id !== sub.id));
  }

  async function downloadPDF() {
    setPdfStatus("building");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdf  = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Courier);
      const visible = subs.filter(s => s.visible);

      for (let i = 0; i < visible.length; i++) {
        const sub = visible[i];
        for (const imgUrl of sub.images) {
          const bytes = await imgToJpegBytes(imgUrl);
          const img   = await pdf.embedJpg(bytes);
          const page  = pdf.addPage([612, 792]);
          const margin = 48;
          const maxW  = 612 - margin * 2;
          const maxH  = 792 - margin * 2 - 32;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width  * scale;
          const h = img.height * scale;
          page.drawImage(img, { x: (612 - w) / 2, y: (792 - h) / 2 + 16, width: w, height: h });
          page.drawText(sub.name.toUpperCase(), { x: margin, y: margin - 12, size: 7, font, color: rgb(0, 0, 0) });
          page.drawText(String(i + 1).padStart(5, "0"), { x: 612 - margin - 30, y: margin - 12, size: 7, font, color: rgb(0.7, 0.7, 0.7) });
        }
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes.buffer.slice(0) as ArrayBuffer], { type: "application/pdf" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `harvest-${primaryTheme}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      a.click();
      setPdfStatus("done");
      setTimeout(() => setPdfStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setPdfStatus("idle");
    }
  }

  const visible = subs.filter(s => s.visible);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs tracking-widest text-gray-400 mt-1">{visible.length} visible · {subs.length} total</p>
        <div className="flex gap-3 flex-wrap">
          <div style={{ display: "flex", border: "1px solid #e5e5e5" }}>
            {(["book", "grid"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="text-xs tracking-widest uppercase px-4 py-2 cursor-pointer bg-transparent border-none"
                style={{ color: view === v ? "#000" : "#bbb", background: view === v ? "#f5f5f5" : "transparent" }}>
                {v}
              </button>
            ))}
          </div>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs tracking-widest uppercase text-gray-400 hover:text-black border border-gray-200 px-4 py-2">
              view public →
            </a>
          )}
          <button
            onClick={downloadPDF}
            disabled={pdfStatus === "building" || visible.length === 0}
            className="text-xs tracking-widest uppercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pdfStatus === "building" ? "building..." : pdfStatus === "done" ? "downloaded ✓" : `pdf (${visible.length})`}
          </button>
        </div>
      </div>

      {!loaded ? (
        <p className="text-xs tracking-widest text-gray-400">loading...</p>
      ) : subs.length === 0 ? (
        <p className="text-xs tracking-widest text-gray-400">no submissions yet.</p>
      ) : view === "book" ? (
        <BookViewer subs={subs} title={title} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {subs.map((sub, i) => (
            <div key={sub.id} style={{ display: "flex", flexDirection: "column", gap: 6, opacity: sub.visible ? 1 : 0.35 }}>
              <div style={{ aspectRatio: "8.5 / 11", background: "#f5f5f5", overflow: "hidden", position: "relative" }}>
                {sub.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.images[0]} alt={sub.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
                {!sub.visible && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Courier New',monospace" }}>hidden</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <p style={{ fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Courier New',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{sub.name}</p>
                <p style={{ fontSize: 7, color: "#ccc", fontFamily: "'Courier New',monospace" }}>{String(i + 1).padStart(5, "0")}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => toggleVisible(sub)}
                  disabled={toggling === sub.id}
                  style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Courier New',monospace", background: "none", border: "none", cursor: "pointer", color: "#999", padding: 0 }}
                >
                  {sub.visible ? "hide" : "show"}
                </button>
                <button
                  onClick={() => remove(sub)}
                  style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Courier New',monospace", background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: 0 }}
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Books studio tab ────────────────────────────────────────────────────────

// Built from lib/books registry — add books there, not here
const STUDIO_BOOKS = [
  ...BOOKS.map(b => ({
    id: b.slug,
    label: b.title,
    themes: [b.slug],
    title: b.title,
    publicUrl: `/harvest/${b.slug}`,
  })),
  {
    id: ANTHOLOGY_SLUG,
    label: ANTHOLOGY_TITLE,
    themes: BOOKS.map(b => b.slug),
    title: ANTHOLOGY_TITLE,
    publicUrl: `/harvest/${ANTHOLOGY_SLUG}`,
  },
];

function HarvestStudioTab() {
  const [activeBook, setActiveBook] = useState(STUDIO_BOOKS[0].id);
  const book = STUDIO_BOOKS.find(b => b.id === activeBook) ?? STUDIO_BOOKS[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Book selector */}
      <div className="flex flex-col gap-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="text-xs tracking-widest uppercase">books</p>
          <a href="/harvest" target="_blank" rel="noopener noreferrer"
            className="text-xs tracking-widest uppercase text-gray-400 hover:text-black">
            public library →
          </a>
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f0f0f0" }}>
          {STUDIO_BOOKS.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBook(b.id)}
              className="text-xs tracking-widest uppercase bg-transparent border-none cursor-pointer"
              style={{
                padding: "8px 20px 10px",
                color: activeBook === b.id ? "#000" : "#ccc",
                borderBottom: activeBook === b.id ? "1px solid #000" : "1px solid transparent",
                marginBottom: -1,
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <HarvestBook
        key={book.id}
        themes={book.themes}
        title={book.title}
        publicUrl={book.publicUrl}
      />
    </div>
  );
}
