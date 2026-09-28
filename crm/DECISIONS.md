# Intern CRM — decisions

Running list of calls made while building `/crm` without stopping to ask.

## Stack & setup
1. **npm, not pnpm.** The repo has a `package-lock.json` and Vercel installs from it; switching lockfiles
   is out of scope. Every script works with `npm run <x>` or `pnpm <x>`: `typecheck`, `crm:seed`,
   `crm:migrate`, `crm:generate`, `crm:e2e`, `crm:test`, `crm:lint`.
2. **`middleware.ts` → `proxy.ts`.** Next 16 renamed middleware to proxy. The existing lunch-bells
   password gate moved over unchanged, and the `/crm` gate sits beside it.
3. **Two database drivers behind one Drizzle API** (`crm/db/index.ts`). A `postgres://` `DATABASE_URL`
   uses postgres-js with `prepare: false` so it works with Supabase's transaction pooler. An unset
   `DATABASE_URL`, or one set to `pglite:<dir>`, uses embedded PGlite on disk. PGlite migrates itself
   and seeds itself on first use, so dev and e2e run without a Supabase project or Docker. PGlite is
   refused in production.
4. **Local sign-in when Supabase isn't configured.** With no `NEXT_PUBLIC_SUPABASE_*` env and
   `NODE_ENV !== production`, allowlisted emails sign in straight away with an HMAC-signed cookie
   (`CRM_DEV_SECRET`, which has a default). The allowlist still applies. Production never does this
   unless `CRM_DEV_AUTH=1` is set explicitly. The Playwright test uses this mode.
5. **Magic links only go to allowlisted emails.** The allowlist is checked before `signInWithOtp`, so
   nobody else is sent a link, and the proxy, the layout and every server action check it again.
6. **Supabase-specific SQL** (RLS, the Realtime publication, the storage bucket and its policies)
   lives in `crm/db/supabase.sql`, not in Drizzle migrations, because PGlite has no
   `auth`/`storage` schemas. Run it once in the Supabase SQL editor after `crm:migrate`.
7. **`SUPABASE_SERVICE_ROLE_KEY` is listed but unused.** The seed writes through `DATABASE_URL`
   (the postgres role), so it doesn't need the key. It's kept in `.env.example` as the spec asked.
8. **One CRM timezone** (`NEXT_PUBLIC_CRM_TZ`, default `America/New_York`). "Today", the now-line,
   live/past status and the seed's date shift all use it, so the server (UTC on Vercel) and browsers agree.
9. **Every CRM route is dynamic.** Auth calls `connection()`, so no CRM page can be prerendered
   (an early build baked a signed-out redirect into static HTML).

## Data model
10. **`candidates.seq`** (serial) was added for the human-facing `#0001` ID column and the
    "New candidate #0005" activity titles.
11. **Removing an interviewer is blocked** when they have interviews or notes: the FKs are `restrict`
    so history keeps its author. The error says why.
12. **Seed interviewers have no emails in `seed.json`.** "Naim J." gets the first
    `CRM_ALLOWED_EMAILS` entry, so the owner's sign-in lands on the seeded row. The others get
    `<name>@seed.crm.local`.
13. **The seed's activity `badge` ("by 19:00") is dropped.** The `activity` table has no badge column,
    and adding one for a single seed row wasn't worth it.
14. **Seed idempotency:** rows get deterministic UUIDs (sha1 of the seed id) and inserts use
    `ON CONFLICT DO NOTHING`, so a second run changes nothing and doesn't clobber edits.
    `crm:seed --reset` (and Settings → Reset demo data) truncates candidate data first. Interviewers
    are kept.
15. **Seed timestamps are wall-clock times in the CRM timezone**, shifted by the same day offset as
    `baseDate` → today.

## Behaviour
16. **"First completed interview"** means the first time actual minutes are logged on any of the
    candidate's interviews. That moves them to *in process* unless they're awaiting or decided.
17. **Logging is only allowed once an interview has started** (live or past), and the server checks
    this too. Saving minutes writes an activity entry; saving only the debrief doesn't.
18. **Overlap rule:** checked in the form for an instant message, then enforced in the server action
    inside a transaction with a per-interviewer `pg_advisory_xact_lock`, so two people can't book
    the same slot at once. Back-to-back (11:45 end / 11:45 start) is allowed. Only the interviewer's
    calendar is checked, not the candidate's.
19. **Interviewer load %** = minutes booked today + tomorrow ÷ two 9-hour days.
20. **Average fit sparkline** = running average of fit scores in the order candidates were added.
21. **"Need scheduling"** = new / queued / in-process candidates with no upcoming or live interview.
22. **Table "Interviewer" column** = the interviewer of the next interview, or of the latest one if
    nothing is upcoming. **"Area" column** = the first attached area (goals are left out).
23. **"Looks best suited to…"** uses keyword buckets (`crm/lib/suggest.ts`) that match skill names,
    weighted by score, plus resume skills, against area names and descriptions. It only suggests
    areas, never goals.
24. **Data loading:** the `(app)` layout loads the whole CRM as one snapshot (the team is small), and
    views filter on the client. Server actions return `{ok, error}` and call `refresh()`. The client
    applies optimistic patches with `useOptimistic` inside a transition. Revisit if the pool grows
    past a few hundred candidates.
25. **Live updates:** Supabase Realtime (any change on interviews/notes/candidates/activity triggers
    a debounced `router.refresh()`) when Supabase is configured. Otherwise the page refreshes on
    window focus and every 60s.
26. **Resume upload:** in production the browser uploads straight to the private `resumes` bucket,
    because Vercel caps function request bodies at 4.5 MB (below the 10 MB limit), then a server
    action stores the path. Downloads go through `/crm/api/resume/[id]`, which checks the allowlist
    and redirects to a 60-second signed URL. In local mode, files go to `crm/.uploads`. The PDF type,
    10 MB size and (locally) `%PDF-` magic bytes are checked.
27. **Adding an interviewer in Settings doesn't grant sign-in.** The allowlist is still the
    `CRM_ALLOWED_EMAILS` env var, as specified. The Settings list flags people who aren't on it.
28. **Reset demo data** shows when `NODE_ENV !== production` (or `CRM_DEV_AUTH=1`).
29. **Extras beyond the spec:** cancel an upcoming interview (with confirm), an optional location
    field, and a phone field in the attributes.

## UI
30. **Brand assets are placeholders.** `docs/fomo_Brand_Kit.pdf`, the prototype HTML and the real
    logo masks weren't in the repo. `public/crm/brand/wordmark.png` and `eyes.png` are generated
    stand-in masks (alpha only, rendered through `mask-image` with `--logo`). Drop the real files in
    at the same paths and nothing else needs to change. If the real wordmark's aspect ratio isn't
    1080:380, update `.crm-wordmark` in `crm.css`.
31. **DM Sans stands in for Aeonik** (`crm/ui/fonts.ts`), because the licensed woff2 files aren't in
    `public/fonts/`. The file has the exact `next/font/local` swap in a comment. `next/font/local`
    needs the files at build time, so it can't be switched on automatically.
32. **Global CSS isolation.** The site's `globals.css` has unlayered `* { margin:0; padding:0 }` and
    `input, textarea, button { font-family: Courier; color: inherit }`. Those would beat Tailwind's
    layered utilities, so `crm.css` rolls exactly those properties back with `revert-layer`, scoped
    to `[data-crm]`.
33. **Theme:** an inline script in the CRM layout sets `data-theme` on `<html>` before paint, from
    localStorage or else the OS preference. The root `<html>` gets `suppressHydrationWarning` (the
    only change to the portfolio's root layout) because of that pre-hydration attribute. Tokens are
    scoped to `[data-crm]`, so the attribute has no effect on the portfolio.
34. **Breakpoints:** below 900px the rail becomes a horizontal top nav and KPI cards stack. Between
    900 and 1200px KPIs are 2-up; at 1200px and up it's 3 equal + 1 at 1.25fr, with the schedule
    beside the 372px activity card.
35. **Warnings use `--highlight`** (`#4A36FF` light / `#ACB8F9` dark) text, never red. Toasts and
    the drawer are the only motion, and both are disabled under `prefers-reduced-motion`.

## Verification notes
36. **Repo-wide `npm run lint` has 43 errors, all in existing portfolio files** (components/*,
    app/api/notifications, …) and none in CRM code. `npm run crm:lint` covers the CRM and is clean.
37. **`next build` fails locally on the existing `/reels/admin` page** without `KV_REST_API_*`
    credentials (it prerenders from Vercel KV). With that page set aside, the build succeeds, and
    all CRM routes compile as dynamic. It should build on Vercel, where the KV env exists.
