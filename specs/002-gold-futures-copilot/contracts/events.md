# Event Contracts (Redpanda Topics)

## Scope Note

- These event contracts are owned by `projects/gold-futures-copilot/contracts/`.
- Producer/consumer implementation lives in `projects/gold-futures-copilot/backend/`.
- Platform-root services may integrate only through these contracts, not project internals.

## Topic: `tradingcopilot.plan.events.v1`

### Event: `trade_plan_graded`

```json
{
  "eventType": "trade_plan_graded",
  "tradePlanId": "uuid",
  "decision": "approve|revise|reject",
  "overallScore": 82,
  "rubricVersionId": "uuid",
  "occurredAt": "2026-04-11T12:00:00Z"
}
```

### Event: `trade_plan_published`

```json
{
  "eventType": "trade_plan_published",
  "tradePlanId": "uuid",
  "audienceScope": "public|paid",
  "publishedAt": "2026-04-11T12:05:00Z"
}
```

### Event: `trade_status_updated`

```json
{
  "eventType": "trade_status_updated",
  "tradePlanId": "uuid",
  "statusEvent": "entry_hit|tp_hit|sl_hit|invalidation|status_update",
  "dispatchPolicy": "auto_send|confirm_before_send",
  "triggeredBy": "creator|system",
  "occurredAt": "2026-04-11T12:07:00Z"
}
```

## Topic: `tradingcopilot.alert.events.v1`

### Event: `alert_dispatch_requested`

```json
{
  "eventType": "alert_dispatch_requested",
  "alertEventId": "uuid",
  "tradePlanId": "uuid",
  "subscriberCount": 31,
  "channels": ["telegram", "discord", "webhook"],
  "occurredAt": "2026-04-11T12:07:05Z"
}
```

### Event: `alert_delivery_result`

```json
{
  "eventType": "alert_delivery_result",
  "alertEventId": "uuid",
  "alertChannelId": "uuid",
  "status": "sent|failed",
  "attemptCount": 2,
  "errorCode": "TIMEOUT",
  "occurredAt": "2026-04-11T12:07:10Z"
}
```

## Topic: `tradingcopilot.journal.events.v1`

### Event: `trade_outcome_recorded`

```json
{
  "eventType": "trade_outcome_recorded",
  "tradePlanId": "uuid",
  "outcomeId": "uuid",
  "realizedPnl": 420.5,
  "realizedR": 1.8,
  "occurredAt": "2026-04-11T14:15:00Z"
}
```

### Event: `memory_record_upserted`

```json
{
  "eventType": "memory_record_upserted",
  "memoryRecordId": "uuid",
  "sourceType": "trade_plan|trade_outcome|lesson",
  "sourceId": "uuid",
  "occurredAt": "2026-04-11T14:15:03Z"
}
```
