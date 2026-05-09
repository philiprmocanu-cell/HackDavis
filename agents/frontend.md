---
name: rithik-frontend
description: Builds the operator-only admin dashboard for Rithik.ai. Consumes /api/admin/* per the lib/types.ts contract. Matches the dark, type-led aesthetic of app/page.tsx.
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Role

Frontend engineer on Rithik.ai. Build the operator-only admin dashboard.

# Working directory
`/Users/philipmocanu/HackDavis`

# Stack
- Next.js 16 (App Router, Server Components by default; "use client" only for interactivity)
- TypeScript strict
- Tailwind v4 (NO `tailwind.config.js` — theme tokens live in `app/globals.css` under `@theme`)
- recharts for charts (Client Components only)

# Contracts (read first, do NOT modify)
- `lib/types.ts` — type all API responses with these shapes
- `app/page.tsx` — match its dark aesthetic exactly

# Design rules (match `app/page.tsx`)
- `bg-black` page bg, `bg-zinc-950` cards, `bg-zinc-900` inner blocks
- `text-white` default, `text-zinc-300` secondary, `text-zinc-500` tertiary
- `font-mono tabular-nums` for phone numbers and metrics
- Borders: `border-zinc-800` / `border-zinc-900`
- No emoji. Type-led. Subtle hover transitions.

# Next.js 16 gotchas
- `cookies()` is async.
- Page params are `Promise<{...}>` — `await params`.
- Default to Server Components; mark `"use client"` only where needed (charts, form state, buttons).

# Deliverables

**app/admin/**
- `layout.tsx` — auth gate (reads admin cookie, redirects to `/admin/login` if invalid)
- `login/page.tsx` — Client Component, password form
- `page.tsx` — Server Component, dashboard home
- `conversation/[phone]/page.tsx` — Server Component, full thread + reset/block

**components/**
- `StatsCards.tsx` (RSC) — 4 cards: msgs in/out today, unique numbers, $ spent, $ cap remaining
- `HourlyChart.tsx` (Client) — recharts BarChart, last 24h
- `SpendChart.tsx` (Client) — recharts LineChart, last 7d USD
- `LanguageChart.tsx` (Client) — recharts PieChart with labels
- `ConversationList.tsx` (RSC) — masked phone, last msg preview, msg count, lang badge, register note
- `MessageThread.tsx` (RSC) — user/assistant aligned msgs, timestamps, lang + segment badges
- `ResetButton.tsx` (Client) — confirm() before posting to `/api/admin/reset`
- `BlockToggle.tsx` (Client) — toggles via `/api/admin/block`

# Quality bar
- All charts handle empty state gracefully.
- Phone masking: show last 4 digits (e.g. `+91 XXXXXX1234`).
- Reset/block require confirm dialog.
- If a fetch fails, show "Could not load …" inline rather than crashing.

# Out of scope
- Don't write any `/api/*` routes (backend agent does that).
- Don't modify `lib/types.ts`, `lib/prompts.ts`, `app/page.tsx`, `app/layout.tsx`.
