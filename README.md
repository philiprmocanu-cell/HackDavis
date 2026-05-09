# Rithik.ai

SMS-based AI assistant for India. Text our number from any phone — including Nokia feature phones — and get an answer back in your language.

Built for [HackDavis](https://hackdavis.io).

## What it does

- Receives SMS via a Twilio webhook
- Calls Anthropic Claude Haiku 4.5 with conversation memory (last 16 messages, 24h TTL)
- Replies via SMS in the user's language and script: Hindi (Devanagari), Hinglish, Haryanvi, Punjabi (Gurmukhi or Latin), Urdu, English — code-mixing supported
- Adapts to the user's literacy and register: short, plain replies for users with limited schooling; more nuanced for fluent users. Never condescends.
- Refuses to invent India-specific facts (gov scheme amounts, prices, addresses) — replies "mujhe pakka nahi pata" with the right authority to ask
- Operator dashboard at `/admin` for monitoring conversations, costs, language distribution, and rate-limit/spend status

## Stack

- **Next.js 16** (App Router, Tailwind v4, Server Components)
- **Anthropic Claude Haiku 4.5** with prompt caching
- **Twilio** for SMS (US long code; deliverability tested per carrier)
- **Upstash Redis** for conversation history, rate limits, daily spend tracking
- **Vercel** for deployment

## Architecture

```
Nokia SMS → Twilio → POST /api/sms → Claude Haiku 4.5
                          ↓
                    Upstash Redis (history, rate limits, spend cap)
                          ↑
                operator → /admin → /api/admin/* (HMAC-signed cookie)
```

The webhook is synchronous — Claude replies in 1–3 s, well under Twilio's 15 s webhook timeout, so we return TwiML inline rather than queueing.

## Setup

```bash
git clone https://github.com/philiprmocanu-cell/HackDavis.git
cd HackDavis
npm install
cp .env.example .env.local
# Fill in: ANTHROPIC_API_KEY, TWILIO_*, UPSTASH_*, ADMIN_PASSWORD, ADMIN_COOKIE_SECRET
npm run dev
```

Configure the Twilio number's "A MESSAGE COMES IN" webhook to `https://<your-domain>/api/sms` (POST).

## Repo layout

```
app/
  api/sms/route.ts             Twilio webhook
  api/admin/*/route.ts         Admin API (auth-gated)
  admin/                       Operator dashboard
  page.tsx                     Landing page
lib/
  prompts.ts                   SYSTEM_PROMPT + helpers (heart of the project)
  claude.ts                    Anthropic SDK wrapper
  twilio.ts                    Signature validation, TwiML builders
  memory.ts                    Redis conversation history
  ratelimit.ts                 Per-number bucket + daily $ cap
  admin-auth.ts                HMAC-signed cookie auth
  language.ts                  Script detection (Indic vs Latin)
  sms-cost.ts                  Segment + cost estimation
  types.ts                     Shared API contract types
components/                    Dashboard UI (charts, lists, threads)
docs/
  RESEARCH.md                  Haryana literacy / connectivity / AI-limitations brief
agents/
  research.md                  ─┐
  response-framework.md         ├ Agent specs — portable to Antigravity
  backend.md                    │  or any agent platform with system-prompt
  frontend.md                  ─┘  + tool-allowlist configuration
```

## How the system prompt works

`lib/prompts.ts` is the single most important behavioral surface. It enforces:
- **Language match** — reply in the exact same language and script the user used
- **Length cap** — ≤300 chars Latin/Hinglish, ≤140 chars Indic (Unicode SMS is 70/segment)
- **No markdown, no preamble** — Nokia screens render plain text only
- **Register match** — short msg → short reply, simple words → simple words, concrete user → concrete examples
- **Refusals** for unverifiable India-specific facts (gov schemes, prices, medical, legal)
- A trailing `[lang:<bcp47>;chars:<n>]` tag the webhook strips before sending the SMS

Read `docs/RESEARCH.md` for the audience research that shaped these rules.

## Cost reality

Outbound SMS to India from a US long code is the dominant cost (~$0.06/segment Latin, ~$0.10+/segment Indic, because Unicode SMS is 70 chars/segment). Pilot at 50–100 msgs/day ≈ $100–200/mo. The webhook enforces `DAILY_USD_CAP` and per-number `PER_NUMBER_HOURLY_LIMIT` so you can't blow up the bill.

## Built with parallel agents

The four agents in `/agents` were run in parallel:
- **research** — surveyed Haryana literacy, connectivity, languages → `docs/RESEARCH.md`
- **response-framework** — authored the system prompt → `lib/prompts.ts`
- **backend** — built webhook + admin API + lib helpers
- **frontend** — built the operator dashboard

Each spec uses YAML frontmatter (name, description, model, tools) plus a markdown system-prompt body — paste each into Antigravity's Agents panel (or any platform that takes a system prompt + tool allowlist) to reuse them.
