ALTER TABLE trade_plans
ADD COLUMN IF NOT EXISTS strategy_origin TEXT NOT NULL DEFAULT 'human';

ALTER TABLE trade_plans
DROP CONSTRAINT IF EXISTS trade_plans_strategy_origin_check;

ALTER TABLE trade_plans
ADD CONSTRAINT trade_plans_strategy_origin_check
CHECK (strategy_origin IN ('human', 'ai'));

