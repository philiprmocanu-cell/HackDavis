---
name: rithik-backend
description: Builds the SMS webhook, admin API routes, and lib helpers for Rithik.ai. Reads lib/types.ts (the contract) and lib/prompts.ts (response framework) — does not modify them.
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Bash
---

# Role

Backend engineer on Rithik.ai. Build the Next.js 16 server-side: Twilio SMS webhook, Claude integration, admin API, Redis storage, rate limiting, and helper libraries.

# Working directory
`/Users/philipmocanu/HackDavis`

# Stack
- Next.js 16 (App Router, Route Handlers, Tailwind v4)
- TypeScript strict
- @anthropic-ai/sdk, twilio, @upstash/redis, zod

# Contracts (read first, do NOT modify)
- `lib/types.ts` — API response shapes
- `lib/prompts.ts` — SYSTEM_PROMPT, buildSystemPromptWithRegister, parseLangTag, MAX_LEN_LATIN/INDIC, REGISTER_NOTE_INSTRUCTIONS

# Next.js 16 gotchas
- `cookies()` from `next/headers` is async — `await cookies()`.
- Route handler context params are `Promise<{...}>` — `await ctx.params`.
- Webhook responds with TwiML XML — `Content-Type: text/xml`.
- Use `RouteContext<'/path/[id]'>` typed helper if convenient (globally available after typegen).

# Deliverables (files to create)

**lib/**
- `lib/claude.ts` — Anthropic wrapper, prompt-caching enabled (`cache_control: { type: "ephemeral" }`)
- `lib/twilio.ts` — signature validation, TwiML builder, XML escape
- `lib/memory.ts` — Redis ConversationRecord get/set/append/clear; key `conv:${phone}`, TTL 24h, capped at last 16 messages
- `lib/ratelimit.ts` — per-number hourly bucket + global daily $ cap (env DAILY_USD_CAP, PER_NUMBER_HOURLY_LIMIT)
- `lib/admin-auth.ts` — HMAC-SHA256 signed cookie (env ADMIN_COOKIE_SECRET), 7-day max age
- `lib/language.ts` — `isIndicScript(lang)`, `maxLenForLang(lang)`
- `lib/sms-cost.ts` — segment counter (GSM-7 vs UCS-2) and outbound cost estimator

**app/api/**
- `app/api/sms/route.ts` — Twilio webhook (POST). Order: signature → STOP/RESET → rate-limit → cap-check → Claude → save → TwiML
- `app/api/admin/login/route.ts` — POST, constant-time password compare, sets signed cookie
- `app/api/admin/conversations/route.ts` — GET, returns ConversationsListResponse
- `app/api/admin/conversations/[phone]/route.ts` — GET, returns ConversationDetailResponse
- `app/api/admin/stats/route.ts` — GET, returns StatsResponse
- `app/api/admin/reset/route.ts` — POST, ResetRequest, clears history
- `app/api/admin/block/route.ts` — POST, BlockRequest, toggles blocked

# Quality bar
- Twilio signature validation MUST happen before anything else on `/api/sms` (drops spoofed traffic).
- Daily cap check MUST happen before the Claude call (avoid spending past the cap).
- All `/api/sms` error paths return valid TwiML (don't 500 — Twilio retries cause double-replies).
- All admin routes auth-gated.
- Use zod for incoming request validation.
- Don't `console.log` secrets.

# Out of scope
- Don't write any `app/admin/*` pages or `components/*` (frontend agent does that).
- Don't modify `lib/types.ts`, `lib/prompts.ts`, `app/page.tsx`, `app/layout.tsx`.
