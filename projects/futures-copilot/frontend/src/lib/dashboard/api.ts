const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api';

export interface AIFeatureConfig {
  key: string;
  provider: string;
  model: string;
}

export interface AIProviderConfigPayload {
  features: AIFeatureConfig[];
  timeoutMs: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

export const API_ENDPOINTS = {
  trades: `${API_BASE}/trades`,
  accounts: `${API_BASE}/accounts`,
  rubrics: `${API_BASE}/rubrics`,
};

export const draftTrade = async (tradeData: unknown) => {
  const res = await fetch(`${API_BASE}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tradeData),
  });
  if (!res.ok) throw new Error('Failed to draft trade');
  return res.json();
};

export const updateTradeStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_BASE}/trades/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update trade status');
  return res.json();
};

export const saveAccount = async (accountData: unknown) => {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!res.ok) throw new Error('Failed to save account');
  return res.json();
};

export const deleteAccount = async (id: string) => {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete account');
  return res.json();
};

export const saveRubric = async (rubricData: unknown) => {
  const res = await fetch(`${API_BASE}/rubrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rubricData),
  });
  if (!res.ok) throw new Error('Failed to save rubric');
  return res.json();
};

export const deleteRubric = async (id: string) => {
  const res = await fetch(`${API_BASE}/rubrics/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete rubric');
  return res.json();
};

export const journalTrade = async (journalData: unknown) => {
  const res = await fetch(`${API_BASE}/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(journalData),
  });
  if (!res.ok) throw new Error('Failed to journal trade');
  return res.json();
};

export const scrapeRulesFromUrls = async (urls: string[], accountType: string) => {
  const res = await fetch('/api/copilot/ai/scrape-account-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, accountType }),
  });
  if (!res.ok) throw new Error('Failed to scrape rules');
  return res.json() as Promise<{ context?: string }>;
};

export const improveRulesContext = async (text: string, accountType: string) => {
  const res = await fetch('/api/copilot/ai/improve-account-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, accountType }),
  });
  if (!res.ok) throw new Error('Failed to improve rules');
  return res.json() as Promise<{ context?: string }>;
};

export const getAIAvailability = async () => {
  const res = await fetch('/api/copilot/ai/availability', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch AI availability');
  return res.json() as Promise<{ availableProviders?: string[] }>;
};

export const getAIProviderConfig = async () => {
  const res = await fetch('/api/copilot/ai/config', { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch AI provider config (${res.status}): ${text || 'no response body'}`);
  }
  return res.json() as Promise<AIProviderConfigPayload & { updatedAt?: string; availableProviders?: string[] }>;
};

export const saveAIProviderConfig = async (payload: AIProviderConfigPayload) => {
  const res = await fetch('/api/copilot/ai/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save AI provider config (${res.status}): ${text || 'no response body'}`);
  }
  return res.json() as Promise<{ status: string }>;
};
