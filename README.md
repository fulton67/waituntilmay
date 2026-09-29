This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Intern CRM (`/crm`)

A small CRM for running an intern program: candidates, interviews and scores, tiers and rankings, a
campaign with daily task assignments, intern clock-in/out and end-of-day reports, and a "Next up"
list of what to do next. Interviewers use the full app at `/crm`; interns see only their own day at
`/crm/me`. People join through two invite links (one for interviewers, one for interns) that
interviewers copy from Settings; after that they sign in with their email (magic link or 6-digit
code).

**Stack:** Next.js (App Router, server actions), React 19, Drizzle ORM on Postgres, Supabase (Auth,
Realtime, Storage for resume PDFs), Tailwind CSS, Playwright for end-to-end tests. Code lives in
`crm/` and `app/(crm)/crm/`; design decisions are in `crm/DECISIONS.md`.

**Seed data is fictional.** Every candidate, interviewer, school and note in `crm/seed.json` is made
up for demos and tests.

### Run it locally without Supabase

```bash
npm install
CRM_ALLOWED_EMAILS=you@example.com npm run dev
```

With no Supabase env vars, the CRM uses an embedded PGlite database in `crm/.pglite` (migrated and
seeded on first request) and a local sign-in with no email: open
http://localhost:3000/crm/sign-in and enter the email you put in `CRM_ALLOWED_EMAILS` (that's the
owner, who is always an interviewer).

### Run it with your own Supabase project

1. Create a Supabase project. Copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (the pooler
   connection string), `CRM_ALLOWED_EMAILS` (your email) and `NEXT_PUBLIC_SITE_URL`.
2. `npm run crm:migrate` to create the tables, then run `crm/db/supabase.sql` in the Supabase SQL
   editor (row-level security, Realtime, the private `resumes` bucket).
3. Optional: `npm run crm:seed` to load the fictional demo data.
4. In Supabase → Authentication: add `<your site>/crm/auth/confirm` to the redirect URLs, and point
   the Magic Link and Confirm signup email templates at
   `<your site>/crm/auth/confirm?token_hash={{ .TokenHash }}&type=email` (include `{{ .Token }}`
   for the 6-digit code). Use your own SMTP for anything beyond a handful of emails.
5. `npm run dev`, sign in with your owner email, and copy the invite links from Settings.

Tests: `npm run crm:test` (unit), `npm run crm:e2e` (Playwright; runs in local mode, no Supabase
needed), `npm run typecheck`, `npm run crm:lint`.
