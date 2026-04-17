const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api/copilot';

export const fetchTrades = async () => {
  try {
    const res = await fetch(`${API_BASE}/trades`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const fetchAccounts = async () => {
  try {
    const res = await fetch(`${API_BASE}/accounts`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const draftTrade = async (tradeData: any) => {
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

export const saveAccount = async (accountData: any) => {
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

export const fetchRubrics = async () => {
  try {
    const res = await fetch(`${API_BASE}/rubrics`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const saveRubric = async (rubricData: any) => {
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

export const journalTrade = async (journalData: any) => {
  const res = await fetch(`${API_BASE}/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(journalData),
  });
  if (!res.ok) throw new Error('Failed to journal trade');
  return res.json();
};

export const scrapeRulesFromUrls = async (urls: string[]) => {
  const res = await fetch(`${API_BASE}/ai/scrape-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) throw new Error('Failed to scrape rules');
  return res.json();
};

export const improveRulesContext = async (text: string) => {
  const res = await fetch(`${API_BASE}/ai/improve-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to improve rules');
  return res.json();
};
