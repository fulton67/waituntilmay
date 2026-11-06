"""BUILDER Phase A icons: 24 monoline icons in the board's icon style (look.json icon_outline: 24 grid, stroke from the measured
ring stroke, round caps/joins, no fill). Selection = caption keyword counts over existing/posts.json (60 captions), each icon's
keywords listed below; the spec's required set is always kept. -> kit/icons/svg/*.svg, kit/icons/icons.json.
PNG renders (plain + glass) and sheet.png come from scripts/icons_render.py. brand-venv python -I."""
import json, pathlib, re, sys
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; O = B / "kit" / "icons"; (O / "svg").mkdir(parents=True, exist_ok=True)
look = json.load(open(B / "kit" / "look.json", encoding="utf-8"))["devices"]["icon_outline"]
caps = " ".join((p.get("caption") or "") for p in json.load(open(B / "existing" / "posts.json", encoding="utf-8"))).lower()
words = re.findall(r"[a-z]+", caps)

# name: (keywords, required_by_spec, svg body on a 24 grid)
I = {
 "skin":        (["skin", "complexion", "skincare", "skinhealth", "texture", "pores"], True,
                 '<path d="M3 8c3-2 6 2 9 0s6-2 9 0"/><path d="M3 13c3-2 6 2 9 0s6-2 9 0"/><path d="M3 18c3-2 6 2 9 0s6-2 9 0"/>'),
 "procedure":   (["treatment", "treatments", "procedure", "procedures", "treating"], True,
                 '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
 "face":        (["face", "facial", "anatomy", "features", "jawline", "cheek", "cheeks"], False,
                 '<path d="M12 3c-4 0-6.5 3-6.5 7.5 0 4.5 3 9.5 6.5 9.5s6.5-5 6.5-9.5C18.5 6 16 3 12 3z"/><path d="M9.5 10.5h.01M14.5 10.5h.01"/><path d="M10 15.5c1.2.8 2.8.8 4 0"/>'),
 "syringe":     (["filler", "fillers", "injection", "injections", "injectable", "injectables", "jeuveau", "botox", "toxin", "botulinum", "neurotoxin"], True,
                 '<path d="M18 2l4 4"/><path d="M20 4l-3 3"/><path d="M17 7l-9.5 9.5-3 1 1-3L15 5"/><path d="M13 7l4 4"/><path d="M9.5 10.5l2 2M7.5 12.5l2 2"/><path d="M4.5 19.5L2 22"/>'),
 "laser":       (["laser", "lasers", "ellacor", "technology", "energy", "radiofrequency", "microneedling"], True,
                 '<path d="M4 20l6-6"/><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="M14 10l6-6"/><path d="M17 3l1 2M21 7l-2-1M15 2v2M22 9h-2"/>'),
 "drop":        (["hydration", "hydrate", "hydrating", "serum", "moisture", "moisturizer", "water", "acid"], False,
                 '<path d="M12 3s-6 6.5-6 11a6 6 0 0012 0c0-4.5-6-11-6-11z"/><path d="M9 14.5a3 3 0 003 3"/>'),
 "sun":         (["sun", "spf", "sunscreen", "uv", "summer", "pigmentation"], True,
                 '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
 "clock":       (["time", "minutes", "hours", "downtime", "recovery", "weeks", "today", "now"], True,
                 '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 "before-after":(["before", "after", "results", "result", "transformation"], True,
                 '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/><path d="M6.5 12h3M15 12h3M16.5 10.5v3"/>'),
 "book":        (["read", "learn", "guide", "education", "understanding", "information", "article"], True,
                 '<path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1V5z"/><path d="M21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1V5z"/>'),
 "location":    (["nyc", "york", "office", "visit", "location", "avenue", "manhattan", "park"], True,
                 '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>'),
 "phone":       (["call", "phone", "book", "booking", "schedule", "appointment", "contact"], True,
                 '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
 "calendar":    (["event", "events", "schedule", "consultation", "date", "join", "rsvp"], False,
                 '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>'),
 "scalpel":     (["surgery", "surgical", "surgeon", "mohs", "incision", "excision"], False,
                 '<path d="M3 21l8-8"/><path d="M11 13l9.5-9.5c.8 3.5-1 7.5-5 9.5L13.5 15"/><path d="M9 15l2 2"/>'),
 "brain":       (["exomind", "mental", "stress", "mind", "brain", "depression", "anxiety", "mood"], False,
                 '<path d="M9 4a3 3 0 00-3 3 3 3 0 00-2 5.5A3 3 0 006 18a3 3 0 006 0V5.5A2.5 2.5 0 009 4z"/><path d="M15 4a3 3 0 013 3 3 3 0 012 5.5A3 3 0 0118 18a3 3 0 01-6 0"/><path d="M12 10h-2.5M12 14h2.5"/>'),
 "lines":       (["lines", "wrinkles", "wrinkle", "aging", "ageing", "smoother", "smooth", "fine"], False,
                 '<path d="M4 9c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0"/><path d="M4 15c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0" stroke-dasharray="0.01 3"/>'),
 "sparkle":     (["glow", "glowing", "radiant", "radiance", "bright", "luminous", "refreshed"], False,
                 '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/><path d="M19 16.5c.2 1.3.9 2 2.2 2.2-1.3.2-2 .9-2.2 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.2z"/>'),
 "leaf":        (["natural", "naturally", "gentle", "clean", "plant", "botanical"], False,
                 '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l8-8"/>'),
 "target":      (["precision", "precise", "targeted", "target", "personalized", "individual", "tailored"], False,
                 '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
 "heart":       (["wellness", "health", "healthy", "care", "love", "confidence"], False,
                 '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>'),
 "user":        (["patient", "patients", "you", "client", "person"], False,
                 '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7"/>'),
 "chat":        (["question", "questions", "ask", "consultation", "talk", "dm", "comment"], False,
                 '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/>'),
 "arrow":       (["next", "swipe", "more", "link", "bio"], True, '<path d="M4 12h16M14 6l6 6-6 6"/>'),
 "check":       (["yes", "approved", "safe", "proven", "results", "effective"], True, '<path d="M4.5 12.5l5 5L19.5 7"/>'),
 "play":        (["watch", "video", "reel", "listen", "episode", "play"], True, '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5L10 8.5z"/>'),
 "plus":        (["new", "add", "plus", "more"], False, '<path d="M12 5v14M5 12h14"/>'),
 "close":       (["close"], False, '<path d="M6 6l12 12M18 6L6 18"/>'),
 "star":        (["best", "award", "top", "favorite", "favourite", "reviews"], False,
                 '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"/>'),
}
cnt = {n: sum(words.count(k) for k in v[0]) for n, v in I.items()}
req = [n for n, v in I.items() if v[1]]
rest = sorted((n for n in I if n not in req), key=lambda n: -cnt[n])
chosen = req + rest[:24 - len(req)]
chosen.sort(key=lambda n: -cnt[n])
sw = look["stroke_units"]
for n in chosen:
    (O / "svg" / f"{n}.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{I[n][2]}</svg>\n', encoding="utf-8")
for f in (O / "svg").glob("*.svg"):
    if f.stem not in chosen: f.unlink()
json.dump({"rule": __doc__.strip(), "stroke_units": sw, "icons": [{"name": n, "caption_mentions": cnt[n], "keywords": I[n][0], "required_by_spec": I[n][1]} for n in chosen],
           "not_chosen": [{"name": n, "caption_mentions": cnt[n]} for n in I if n not in chosen]}, open(O / "icons.json", "w", encoding="utf-8"), indent=1)
print(len(chosen), [(n, cnt[n]) for n in chosen]); print("dropped", [(n, cnt[n]) for n in I if n not in chosen])
