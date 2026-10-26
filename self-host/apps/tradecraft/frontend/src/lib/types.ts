// Shapes of the API (specs/000-log-trades/contracts/openapi.yaml). Money is always a string of an exact decimal.

export type FieldError = { field: string; message: string };
export type ApiErrorBody = { code: string; message: string; fields?: FieldError[] };

export type Account = {
  id: string;
  name: string;
  currency: string;
  tradingDayStart: string | null;
  archived: boolean;
  kind: "live" | "backtest";
  updatedAt: string;
};

export type Trade = {
  id: string;
  imageCount: number; // how many screenshots the trade has (feature 004)
  accountId: string;
  accountName: string;
  currency: string;
  instrument: string;
  direction: "long" | "short";
  size: string;
  entryPrice: string;
  entryAt: string;
  exitPrice: string;
  exitAt: string;
  dollarsPerPoint: string | null;
  cost: string;
  stopPrice: string | null;
  typedResult: string | null;
  thesis: string | null;
  grossResult: string | null;
  netResult: string | null;
  risk: string | null;
  rMultiple: string | null;
  tradingDay: string;
  reasons: Record<string, string>;
  deleted: boolean;
  updatedAt: string;
  planFollowed: "yes" | "partly" | "no" | null;
  label: "valid_loss" | "mistake" | null;
};

export type Preview = {
  grossResult: string | null;
  costs: string | null;
  netResult: string | null;
  risk: string | null;
  rMultiple: string | null;
  tradingDay: string | null;
  reasons: Record<string, string>;
};

/** What the trade form holds: every field as typed. */
export type TradeFormValues = {
  accountId: string;
  instrument: string;
  direction: "long" | "short" | "";
  size: string;
  entryPrice: string;
  entryAt: string;
  exitPrice: string;
  exitAt: string;
  dollarsPerPoint: string;
  cost: string;
  stopPrice: string;
  typedResult: string;
  thesis: string;
};

// ---------- feature 001 (journal and reflect), contracts/openapi.yaml of the feature ----------

export type DayState = "missing" | "draft" | "reviewed" | "today";
export type WeekState = "reviewed" | "missing" | "not_reviewed";

export type PlanFollowed = { followed: number; notFollowed: number; partly: number; notJudged: number; of: number };
export type MistakeCount = { mistakeId: string; name: string; count: number };

export type Stats = {
  trades: number;
  netResult: string | null;
  currency: string;
  planFollowed: PlanFollowed;
  mistakes: { count: number; byMistake: MistakeCount[] };
  validLosses: { count: number; losingTrades: number };
  winRate: { wins: number; trades: number; percent: number | null };
  reasons: Record<string, string>;
};

export type Focus = {
  period: "week" | "month";
  periodStart: string;
  periodEnd: string;
  body: string | null;
  updatedAt: string | null;
};

export type DayTrade = {
  id: string;
  imageCount: number;
  instrument: string;
  direction: "long" | "short";
  size: string;
  entryAt: string;
  exitAt: string;
  currency: string;
  netResult: string | null;
  risk: string | null;
  rMultiple: string | null;
  thesis: string | null;
  reasons: Record<string, string>;
  judgement: { planFollowed: "yes" | "partly" | "no" | null; label: "valid_loss" | "mistake" | null; mistakes: string[] };
};

export type DailyReview = {
  accountId: string;
  accountName: string;
  currency: string;
  date: string;
  today: string;
  isToday: boolean;
  state: DayState | null;
  answers: { didWell: string; couldImprove: string; nextFocus: string };
  mentalGrade: number | null;
  technicalGrade: number | null;
  reviewedAt: string | null;
  editedAt: string | null;
  updatedAt: string | null;
  tradesChangedAfterReview: number;
  previousDate: string;
  nextDate: string;
  focus: { yesterday: { date: string; body: string } | null; week: Focus; month: Focus };
  stats: Stats;
  trades: DayTrade[];
  dayMistakes: { mistakeId: string; name: string }[];
};

export type DayRow = {
  date: string;
  state: DayState | null;
  trades: number;
  netResult: string | null;
  currency: string;
  planFollowed: PlanFollowed;
  mistakes: number;
};

export type WeekBlock = {
  weekStart: string;
  weekEnd: string;
  current: boolean;
  state: WeekState;
  reviewedAt: string | null;
  summary: { daysWithTrades: number; reviewed: number; draft: number; missing: number };
  days: DayRow[];
};

export type ReviewsMonth = {
  accountId: string;
  accountName: string;
  month: string;
  today: string;
  previousMonth: string;
  nextMonth: string;
  monthFocus: Focus;
  filters: { missing: number; draft: number; reviewed: number };
  weeks: WeekBlock[];
};

export type Calendar = {
  month: string;
  days: { date: string; hasTrades: boolean; missing: boolean }[];
  weeks: { weekStart: string; state: WeekState }[];
  months: string[];
};

export type Judgement = {
  tradeId: string;
  planFollowed: "yes" | "partly" | "no" | null;
  label: "valid_loss" | "mistake" | null;
  mistakeIds: string[];
  updatedAt: string | null;
  isLoss: boolean;
  isWin: boolean;
  validLoss: { available: boolean; reason: string | null };
  trade: DayTrade;
};

export type Mistake = { id: string; name: string; stopLine: number | null; stopPeriod: "week" | "month" | null; retired: boolean; updatedAt: string };
export type CounterCell = { onTrades: number; onDays: number; total: number };
export type CounterRow = {
  mistakeId: string;
  name: string;
  retired: boolean;
  accounts: { accountId: string; name: string; count: number }[];
  week: CounterCell;
  month: CounterCell;
  stopLine: number | null;
  stopPeriod: "week" | "month" | null;
  status: "stop" | "count_only";
  progress: string | null;
};
export type Counter = { period: "week" | "month"; periodStart: string; periodEnd: string; rows: CounterRow[] };

export type WeeklyDay = {
  date: string;
  status: "missing" | "draft" | "reviewed" | "no_trades" | "not_yet" | "today";
  trades: number;
  netResult: string | null;
  planFollowed: PlanFollowed;
  answers: { didWell: string; couldImprove: string; nextFocus: string } | null;
  mentalGrade: number | null;
  technicalGrade: number | null;
};
export type WeeklyReview = {
  accountId: string;
  accountName: string;
  currency: string;
  today: string;
  weekStart: string;
  weekEnd: string;
  state: WeekState;
  reviewedAt: string | null;
  previousWeek: string;
  nextWeek: string;
  focus: { week: Focus; month: Focus };
  days: WeeklyDay[];
  stats: Stats;
};

// ---------- feature 002 (specs/002-sign-in-and-audit-log/contracts/openapi.yaml) ----------
export type Identity = {
  id: string;
  email: string;
  provider: "google";
  addedAt: string;
  lastSignInAt: string | null;
  disabledAt: string | null;
  active: boolean;
};
export type IdentityList = { identities: Identity[]; counts: { all: number; active: number; disabled: number } };
export type AuditEntry = {
  id: string;
  at: string;
  actorKind: "owner" | "agent" | "system";
  identityEmail: string | null;
  kind: string;
  kindLabel: string;
  subject: string;
  changedFields: string[];
  /** For an agent entry: the name of the token that made it. Empty otherwise. */
  actorLabel: string;
};
export type AuditKind = { kind: string; label: string };

// ---------- feature 003 ----------
export type AgentToken = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
};
export type AgentAccess = { enabled: boolean; tokens: AgentToken[] };


/** A screenshot attached to a trade (feature 004). No bytes: the picture is at /api/images/{id}. */
export type TradeImage = {
  id: string;
  tradeId: string;
  name: string;
  note: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
  createdAt: string;
};

export type ImageLimits = { maxBytes: number; maxCount: number; maxNoteChars: number };

export type TradeImages = { items: TradeImage[]; limits: ImageLimits };
