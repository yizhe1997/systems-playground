export type DashboardTab = 'all' | 'draft' | 'working' | 'filled';

export type UserRole = 'ADMIN' | 'ANON' | string;

export interface Account {
  id: string;
  type: string;
  currentBalance: number;
  currentDailyStopLevel: number;
  currentMaxLossLevel: number;
  rulesContext?: string;
}

export interface Trade {
  id: string;
  accountId: string;
  instrument: string;
  bias: 'Long' | 'Short' | string;
  status: 'draft' | 'working' | 'filled' | string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  contracts: number;
  notes?: string;
  rubricId?: string;
  riskAmount?: number;
}

export interface Rubric {
  id: string;
  name: string;
  rules: string;
  pinescript: string;
}

export interface DraftFormState {
  accountId: string;
  instrument: string;
  bias: 'Long' | 'Short';
  entry: string;
  stopLoss: string;
  takeProfit: string;
  contracts: number;
  notes: string;
  rubricId: string;
}

export interface RubricFormState {
  id: string;
  name: string;
  rules: string;
  pinescript: string;
}

export interface AccountFormState {
  id: string;
  type: string;
  currentBalance: number;
  currentDailyStopLevel: number;
  currentMaxLossLevel: number;
  rulesContext: string;
}

export interface JournalDataState {
  pnl: string;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  reflection: string;
}
