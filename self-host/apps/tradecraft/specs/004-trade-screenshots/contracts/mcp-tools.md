# MCP tools, feature 004

One tool is added to the nine of feature 003 (`mcp-tools.md` there). It is read-only like the others, returns the JSON of the owner's own read route for the same arguments, and writes one `agent_read` audit entry per call before the answer is returned.

| Tool | Reads | Arguments | Notes |
|---|---|---|---|
| `list_trade_images` | the images of one trade: `{items: [{id, name, note, contentType, sizeBytes, createdAt}], limits}` | `tradeId` | Details only. **No bytes and no way to fetch them**: the route that serves an image refuses an agent token like every owner route. Wraps `GET /trades/{id}/images` and returns its answer as it is (the `limits` in it are harmless to an agent) |

The trade reads that already exist (`list_trades`, `get_day`) now carry `imageCount` for each trade, so an agent can see which trades have evidence before it asks for their details.

**Not available to an agent**: an image's bytes (no tool exists, and `GET /images/{id}` answers an agent token with the same refusal as any other owner route), adding or removing an image, and editing a note.

**Audit**: a `tools/call` of `list_trade_images` is an `agent_read` entry whose subject names the tool and the trade the way the log names a trade; the answer is never written.
