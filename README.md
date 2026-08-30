# Power Rankings Committee

A weekly fantasy league power rankings app for three analysts (Aryan, Dev, Manit).
Each analyst logs in and drags teams into their personal rank order for
Pre-Draft through Week 17. The app averages the three submissions and
generates:

- An ESPN-style weekly power rankings view, with week-over-week movement
- A full board (the old spreadsheet, auto-computed instead of manual VLOOKUP)
- A trend chart of every team's average rank across the season
- Team management (add/rename/archive/reorder teams)

## Stack

- **Next.js 16** (App Router) — deployed on Vercel
- **Postgres** via **Prisma 6** — stores analysts, teams, weeks, and rankings
- **Auth.js (NextAuth v5)** — credentials login, one account per analyst
- **Recharts** + **dnd-kit** — the trend chart and drag-and-drop ranking UI

## Local development

1. Copy `.env.example` to `.env` and fill in a local Postgres connection
   string plus a generated `AUTH_SECRET` (`npx auth secret`).
2. `npm install`
3. `npm run db:migrate` — creates the schema
4. `npm run db:seed` — creates the 3 analyst logins and the Pre-Draft…Week 17
   weeks. Set `ANALYST_ARYAN_PASSWORD`, `ANALYST_DEV_PASSWORD`,
   `ANALYST_MANIT_PASSWORD` in `.env` first, or the seed will print randomly
   generated passwords to the console.
5. `npm run dev`, then sign in and add your league's teams under **Teams**.

## Deploying

See the deployment walkthrough the assistant provided, or in short: create a
Vercel Postgres/Neon database, set `DATABASE_URL`, `DIRECT_URL`,
`AUTH_SECRET`, and the three `ANALYST_*_PASSWORD` variables in Vercel project
settings, deploy, then run `npm run db:seed` once against the production
database.
