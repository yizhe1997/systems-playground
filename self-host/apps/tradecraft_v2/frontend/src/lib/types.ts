// Shapes of the API (specs/000-log-trades/contracts/openapi.yaml). Money is always a string of an exact decimal.

export type FieldError = { field: string; message: string };
export type ApiErrorBody = { code: string; message: string; fields?: FieldError[] };

export type Account = {
  id: string;
  name: string;
  currency: string;
  tradingDayStart: string | null;
  archived: boolean;
  updatedAt: string;
};

export type Trade = {
  id: string;
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
