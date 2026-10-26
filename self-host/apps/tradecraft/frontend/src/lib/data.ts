import { api } from "./api";
import type { Account, AgentAccess, AuditKind, Calendar, Counter, IdentityList, Mistake, DailyReview, ReviewsMonth, Trade, WeeklyReview, TradeImages } from "./types";

export const getSettings = () => api<{ timeZone: string }>("/settings");
export const getAccounts = (includeArchived = false) => api<Account[]>(`/accounts?includeArchived=${includeArchived}`);
export const getCurrencies = () => api<string[]>("/currencies");
export const getTrade = (id: string) => api<Trade>(`/trades/${encodeURIComponent(id)}`);
export const getTradeImages = (id: string) => api<TradeImages>(`/trades/${encodeURIComponent(id)}/images`);

// ---------- feature 001 ----------
const q = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
export const getReviewsMonth = (accountId: string, month?: string) => api<ReviewsMonth>(`/reviews?${q({ accountId, month })}`);
export const getDay = (accountId: string, date: string) => api<DailyReview>(`/reviews/day?${q({ accountId, date })}`);
export const getCalendar = (accountId: string, month: string) => api<Calendar>(`/reviews/calendar?${q({ accountId, month })}`);
export const getMistakes = (includeRetired = false) => api<Mistake[]>(`/mistakes?includeRetired=${includeRetired}`);
export const getCounter = (period: string, date?: string, accountId?: string) => api<Counter>(`/mistakes/counter?${q({ period, date, accountId })}`);
export const getWeekly = (accountId: string, date: string) => api<WeeklyReview>(`/weekly?${q({ accountId, date })}`);

// ---------- feature 002 ----------
export const getIdentities = (status: "all" | "active" | "disabled" = "all") => api<IdentityList>(`/identities?status=${status}`);
export const getAuditKinds = () => api<AuditKind[]>("/audit/kinds");

// ---------- feature 003 ----------
export const getAgentAccess = () => api<AgentAccess>("/agent");

