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
30. **Brand assets (updated in v2).** The wordmark mask and `eyes-sprite.png` are now derived from
    the official files in `fomo-intro.zip`. See v2 decision 52. `docs/fomo_Brand_Kit.pdf` and the
    prototype HTML still aren't in the repo.
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

## Production deploy (v1)
38. **The Vercel project has no Git integration** (`link: null`), so pushing main doesn't deploy.
    Production deploys run from the CLI (`vercel deploy --prod`), the same way every earlier deploy
    was made.
39. **Supabase pooler host is `aws-1-us-west-2.pooler.supabase.com`.** The `aws-0-…` host from the
    Connect string answered "tenant/user not found".
40. **`CRM_FORCE_LOCAL=1`** (ignored in production) makes a dev server ignore the Supabase keys in
    `.env.local`, so Playwright never touches the production project.

## v2: rankings, campaigns, interns
41. **Migrations 0001/0002.** 0001 adds every new column and table and converts v1 data: fit and
    skill scores go 0–100 → 1–10 (rounded), existing areas become `core`, and the settings row is
    created. 0002 drops `fit_score`. The split avoids drizzle-kit's interactive rename prompt.
42. **`interviews.fit_before`** (added beyond the spec) stores the candidate's fit just before that
    interview was first scored. The ↑/↓ delta is `fit − fit_before` of the latest scored interview,
    and the hollow baseline dot is the first scored interview's `fit_before`. This avoids storing a
    fit history table.
43. **Seed v2.** `seed.json` gains a campaign, ten tasks, five more interviews (two scored, in the
    past), two small jobs, three sessions (one still open) and one report. Fits are replayed from
    interview scores, so the pool spreads across tiers: Kerem 9, Arya 8.5, Pranav 8 (priority);
    Golam 7, Hammaad 6 (standard).
44. **Seed candidate emails moved to `@example.edu`.** In v2 a matching candidate email grants
    intern sign-in, so real-looking addresses like `pranav.r@nyu.edu` could have let a stranger into
    the demo.
45. **Who counts as an intern:** anyone whose email matches a candidate. The proxy only checks that
    someone is signed in; layouts send interns to `/crm/me`, and every server action re-checks the
    role (`interviewerOnly()` / `internOnly()`). Interns can only set status on, clock into and
    report on their own rows.
46. **Clock in / out and reports are intern-only.** Interviewers can change a task's status but
    can't clock in on anyone's behalf; "View as" is read-only. One open session per intern is
    enforced by the action (with an advisory lock) and a partial unique index.
47. **Reassigning a task** closes the previous intern's running session on it (note "Task
    reassigned").
48. **Interns (for rows, stats and proposals)** = candidates with at least one assigned task in the
    current campaign. The Assignments section lists every non-benched candidate, plus benched ones
    that already have tasks.
49. **Tier group headers** use the spec's absolute-band wording ("8 and up", "5–7", "4 and below")
    with short action notes. The percentile phrasing in the spec contradicted "absolute bands, not a
    curve", so I didn't use it.
50. **Leaderboard scale** is floor→10. The spec's "floor→100" is read as a typo, since everything is
    on 1–10.
51. **Rail (per the correction):** eyes (theme toggle), Overview, Schedule, Campaign & assignments,
    Candidates, Areas & goals (drawer), Rankings & tiers (drawer); theme and settings at the bottom.
    Recent activity stays a dashboard card; its "See all" and the bell go to `/crm/activity`.
    Settings is a modal (the `/crm/settings` page still works as a deep link). On mobile the bottom
    bar has eyes, the four sections, Rankings, theme and settings; Areas is reached from the Open
    areas card's "Manage".
52. **Eyes sprite** = frames 2–29 of the official 59-frame `fomo-eyes-turn.webp` (the turn from
    looking right to looking left), cropped square around the mark, 128px per frame, alpha only.
    The rail shows frame 0 in light and frame 27 in dark, and plays `steps(27)` over 1.1s on switch.
    Two keyframe names (to-dark / to-light) guarantee the animation restarts every time.
53. **Intro splash** (superseded by 67: `IntroSplash` was removed) (your `IntroSplash.tsx`) renders once per browser session at the top of the CRM
    layout, sign-in included, with assets in `public/anim/`. Its font now points at the CRM font
    variable. Its gate-before-paint `setState` is lint-annotated, not rewritten.
54. **Card reveal** hides top-level cards until they enter the viewport. Under
    `prefers-reduced-motion` they show immediately. Drawers and modals don't use it.
55. **The e2e server builds into `.next-e2e`** (`NEXT_DIST_DIR`), because Next 16 allows only one
    `next dev` per build directory and another one was already running on :3005. On first run, Next
    added the `.next-e2e` type paths to `tsconfig.json`.
56. **`/crm/api/intern/[id]`** returns an intern's page data as JSON: 401 signed out, 403 for an
    intern asking for someone else, 200 for their own or for any interviewer. `/crm/me` is rendered
    from the same server-side loader, which selects only that intern's rows.
57. **Timesheet CSV** (`/crm/api/timesheet?day=`) is interviewer-only and has exactly the columns
    intern, task, start, end, minutes and note.
58. **Next up proposals** recompute on every state change and on the clock tick, which is 20s, not
    60s; that's cheaper than it sounds for this pool size.

## v2 production deploy
59. **`supabase.sql` now covers the v2 tables** (row-level security plus the `crm_read` policy on settings, campaigns, tasks, sessions and reports; tasks, sessions and reports added to live updates). It is idempotent, so re-run it after future migrations; new tables are otherwise readable through the anon key.
60. **`/crm/brand/*` is public in the proxy**, so the sign-in page can load the wordmark and eyes before anyone signs in.
61. **Production was reseeded with `--reset`** on deploy; interviewer rows were kept.

## Prototype port (styles are the prototype's, unchanged)
62. **`docs/crm-prototype-styles.css` is the source of truth.** `crm/scripts/port-prototype-css.mjs`
    generates `app/(crm)/crm/prototype.css` from it without changing any values: selectors are
    scoped to `[data-crm]`, and everything sits in `@layer components` so Tailwind utilities can
    still override it. Components use the prototype's class names (`.app`, `.rail`, `.card`,
    `.kpis`, `.srow`/`.lane`/`.blk`, `.drawer`/`.d-body`, …). `crm.css` holds only glue (token
    aliases, keeping the site's globals out, behaviour hooks) and the documented deviations below.
63. **Deviations from the prototype:**
    - Under 600px the mobile bar hides the moon/sun toggle (the eyes still toggle the theme) and
      Areas (reachable from Open areas), because nine 44px buttons don't fit in 390px.
    - `.rk` rankings rows wrap under 700px.
    - The prototype's reduced-motion `*` rule doesn't reach pseudo-elements, so they're stopped
      explicitly.
64. **Verification scripts:** `crm/scripts/measure-layout.mjs` compares measured values to the
    prototype and checks nothing leaves its card at 1440/1280/1024/768/390 (including single words
    broken across lines). `crm/scripts/verify-interactions.mjs` is the 57-item interaction
    checklist.
65. **Interviewers can clock an intern in or out from the candidate drawer** (Assignments tab). The
    activity entry adds "by <interviewer>". Reports stay intern-only.
66. **Ambient motion (decisions):** the blobs pause while any drawer or modal is open, and their
    blur drops to 30px under 900px. The live pulses are `::before`/`::after` rings animated on
    transform and opacity only, replacing the prototype's box-shadow keyframes.
67. **Intro:** `IntroSplash` was removed. `IntroOverlay` referenced `/anim/fomo-intro.mp4`, which
    was never in the repo, so production only showed a navy flash. It now plays the official fomo
    eyes-turn animation (`public/anim/fomo-eyes-turn.webm`) at 1.79× so the full turn fits in
    1.4s, with a CSS fade that ends 1.4s after first paint even if JavaScript is slow (limit
    1.5s). It plays once per session, click or any key skips it, it never plays on `/crm/me` or
    sign-in (it only mounts in the interviewer layout), and it never plays under reduced motion
    (the pre-paint script hides it before first paint).
