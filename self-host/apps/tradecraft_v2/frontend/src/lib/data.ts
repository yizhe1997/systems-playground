import { api } from "./api";
import type { Account, Calendar, Counter, Mistake, DailyReview, ReviewsMonth, Trade } from "./types";

export const getSettings = () => api<{ timeZone: string }>("/settings");
export const getAccounts = (includeArchived = false) => api<Account[]>(`/accounts?includeArchived=${includeArchived}`);
export const getCurrencies = () => api<string[]>("/currencies");
export const getTrade = (id: string) => api<Trade>(`/trades/${encodeURIComponent(id)}`);

// ---------- feature 001 ----------
const q = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
export const getReviewsMonth = (accountId: string, month?: string) => api<ReviewsMonth>(`/reviews?${q({ accountId, month })}`);
export const getDay = (accountId: string, date: string) => api<DailyReview>(`/reviews/day?${q({ accountId, date })}`);
export const getCalendar = (accountId: string, month: string) => api<Calendar>(`/reviews/calendar?${q({ accountId, month })}`);
export const getMistakes = (includeRetired = false) => api<Mistake[]>(`/mistakes?includeRetired=${includeRetired}`);
export const getCounter = (period: string, date?: string, accountId?: string) => api<Counter>(`/mistakes/counter?${q({ period, date, accountId })}`);
