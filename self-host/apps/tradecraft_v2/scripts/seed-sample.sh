#!/usr/bin/env bash
# Seeds the three-trade sample day of specs/001-journal-and-reflect/quickstart.md into the running dev stack, for looking at
# the screens. Made-up data. Usage: scripts/seed-sample.sh [api-url]   (default http://127.0.0.1:8081)
set -eu
api="${1:-http://127.0.0.1:8081}"
PY=$(command -v python3 || command -v python)
post() { curl -fsS -X POST "$api$1" -H 'content-type: application/json' -d "$2"; }
id() { "$PY" -c "import sys,json;print(json.load(sys.stdin)['id'])"; }

acct=$(post /accounts '{"name":"Funded 50K","currency":"USD","tradingDayStart":"17:00"}' | id)
trade() { post /trades "{\"accountId\":\"$acct\",\"instrument\":\"NQ\",\"direction\":\"long\",\"size\":\"1\",\"cost\":\"0\",\"dollarsPerPoint\":\"20\",\"entryAt\":\"$1\",\"exitAt\":\"$2\",\"entryPrice\":\"$3\",\"exitPrice\":\"$4\"}" | id; }
trade 2025-09-29T09:00 2025-09-29T09:30 21000.00 21006.00 >/dev/null
trade 2025-09-30T17:10 2025-09-30T17:30 21500.00 21502.75 >/dev/null
w=$(trade 2025-10-01T09:41 2025-10-01T09:58 21450.00 21465.00)
l1=$(trade 2025-10-01T10:14 2025-10-01T10:31 21500.00 21493.75)
l2=$(trade 2025-10-01T10:40 2025-10-01T10:52 21500.00 21493.50)
echo "account $acct; W $w; L1 $l1; L2 $l2"
