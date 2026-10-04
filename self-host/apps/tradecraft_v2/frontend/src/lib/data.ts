import { api } from "./api";
import type { Account, Trade } from "./types";

export const getSettings = () => api<{ timeZone: string }>("/settings");
export const getAccounts = (includeArchived = false) => api<Account[]>(`/accounts?includeArchived=${includeArchived}`);
export const getCurrencies = () => api<string[]>("/currencies");
export const getTrade = (id: string) => api<Trade>(`/trades/${encodeURIComponent(id)}`);
