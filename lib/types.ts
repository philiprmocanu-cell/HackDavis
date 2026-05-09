// Shared types for Rithik.ai. The webhook backend and the admin dashboard
// frontend both consume these — this file is the integration contract.

export type Role = "user" | "assistant";

export interface StoredMessage {
  role: Role;
  content: string;
  ts: number;            // ms epoch
  lang?: string;         // BCP47 tag parsed from Claude's [lang:...] tag (assistant msgs only)
  segments?: number;     // SMS segments billed (assistant msgs only)
  costUsd?: number;      // estimated outbound cost (assistant msgs only)
}

export interface ConversationRecord {
  phone: string;                 // E.164
  messages: StoredMessage[];     // capped at the last 16
  registerNote?: string;         // 1-line user-register summary (refreshed every 3 user msgs)
  blocked?: boolean;
  createdAt: number;
  updatedAt: number;
  totalIn: number;               // lifetime inbound count
  totalOut: number;              // lifetime outbound count
}

export interface ConversationSummary {
  phone: string;                 // raw E.164 (used by the dashboard for routing/reset)
  phoneMasked: string;           // e.g. +91 XXXXXX1234
  lastMessage: string;           // truncated last user message
  lastTs: number;
  msgCount: number;
  primaryLang?: string;          // most-frequent assistant lang tag in this thread
  registerNote?: string;
  blocked?: boolean;
}

export interface ConversationsListResponse {
  conversations: ConversationSummary[];
}

export interface ConversationDetailResponse {
  phone: string;
  phoneMasked: string;
  messages: StoredMessage[];
  registerNote?: string;
  blocked?: boolean;
  totalIn: number;
  totalOut: number;
  createdAt: number;
  updatedAt: number;
}

export interface HourlyBucket {
  hour: string;                  // ISO hour, e.g. "2026-05-09T14:00:00Z"
  count: number;
}

export interface DailyBucket {
  date: string;                  // YYYY-MM-DD
  usd: number;
}

export interface LangBucket {
  lang: string;                  // BCP47, e.g. "hi-Latn"
  count: number;
}

export interface StatsResponse {
  todayMessagesIn: number;
  todayMessagesOut: number;
  todayUniqueNumbers: number;
  todaySpendUsd: number;
  dailyCapUsd: number;
  capRemainingUsd: number;
  hourlyMessages: HourlyBucket[];     // last 24h
  dailySpend: DailyBucket[];          // last 7d
  langDistribution: LangBucket[];     // today
}

export interface ResetRequest {
  phone: string;                 // E.164
}

export interface BlockRequest {
  phone: string;
  blocked: boolean;
}

export interface AdminLoginRequest {
  password: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface OkResponse {
  ok: true;
}
