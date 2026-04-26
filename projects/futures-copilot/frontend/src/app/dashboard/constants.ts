import { AccountFormState, DraftFormState, JournalDataState, RubricFormState } from './types';

export const DEFAULT_RULES_CONTEXT = 'Trailing EOD Max Drawdown: $2000. Daily Loss Limit: $1000.';

export const DEFAULT_DRAFT_FORM: DraftFormState = {
  accountId: '',
  instrument: '',
  bias: 'Long',
  entry: '',
  stopLoss: '',
  takeProfit: '',
  contracts: 1,
  notes: '',
  rubricId: '',
  runAiSetupGrade: false,
};

export const DEFAULT_RUBRIC_FORM: RubricFormState = {
  id: '',
  name: 'New Rubric',
  rules: '',
};

export const DEFAULT_ACCOUNT_FORM: AccountFormState = {
  id: '',
  type: 'TOPSTEP EVAL 50K',
  currentBalance: 50000,
  currentDailyStopLevel: 49000,
  currentMaxLossLevel: 48000,
  rulesContext: DEFAULT_RULES_CONTEXT,
};

export const DEFAULT_JOURNAL_DATA: JournalDataState = {
  pnl: '',
  outcome: 'WIN',
  reflection: '',
};
