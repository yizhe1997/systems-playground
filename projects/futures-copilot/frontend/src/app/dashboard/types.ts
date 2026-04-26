export type DashboardTab = 'all' | 'draft' | 'working' | 'filled' | 'closed' | 'invalidated';

export type UserRole = 'ADMIN' | 'ANON' | string;

export interface Account {
  id: string;
  type: string;
  currentBalance: number;
  currentDailyStopLevel: number;
  currentMaxLossLevel: number;
  rulesContext?: string;
  createdAt?: string;
}

export interface Trade {
  id: string;
  accountId: string;
  instrument: string;
  bias: 'Long' | 'Short' | string;
  status: 'draft' | 'working' | 'filled' | 'closed' | 'invalidated' | string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  contracts: number;
  notes?: string;
  rubricId?: string;
  riskAmount?: number;
  aiSetupGradeStatus?: 'not_requested' | 'queued' | 'grading' | 'ready' | 'failed' | string;
  aiSetupFindings?: string;
  invalidationReason?: string;
  invalidatedAt?: string;
  createdAt?: string;
}

export interface PaginatedTradesResponse {
  items: Trade[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Rubric {
  id: string;
  name: string;
  rules: string;
}

export interface InstrumentDefinition {
  code: string;
  createdAt?: string;
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
  runAiSetupGrade: boolean;
  aiSetupFindings?: string;
}

export interface RubricFormState {
  id: string;
  name: string;
  rules: string;
}

export interface AccountFormState {
  id: string;
  type: string;
  currentBalance: number;
  currentDailyStopLevel: number;
  currentMaxLossLevel: number;
  rulesContext: string;
}

export interface AIFeatureConfig {
  key: string;
  label?: string;
  provider: string;
  model: string;
  timeoutMs?: number;
}

export interface AIProviderConfigState {
  features: AIFeatureConfig[];
  timeoutMs: number;
  availableProviders?: string[];
  modelPresets?: Record<string, string[]>;
}

export interface JournalDataState {
  pnl: string;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  reflection: string;
}
