# EarningsCalls MCP Server

Model Context Protocol server that gives AI agents direct access to the EarningsCalls.dev dataset — 24,000+ structured earnings call transcripts, speaker segments with cleanly separated Executive / Analyst / Operator roles, full-text search, and more.

Built as a thin MCP wrapper around the public REST API at https://earningscalls.dev/api/v1.

---

## Requirements

- **Node.js 18+**
- **Paid EarningsCalls subscription** (Pro, Ultra, or Enterprise)

The MCP server is **paid-only**. The free test key does not work here — use the subscription flow on [earningscalls.dev/#pricing](https://earningscalls.dev/#pricing) to get your key. Plans start at $24.99/month.

---

## Installation

### Claude Code (CLI)

```bash
claude mcp add earningscalls \
  --env EARNINGSCALLS_API_KEY=ect_your_key_here \
  -- npx -y @earningscalls/mcp-server
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your OS, and add:

```json
{
  "mcpServers": {
    "earningscalls": {
      "command": "npx",
      "args": ["-y", "@earningscalls/mcp-server"],
      "env": {
        "EARNINGSCALLS_API_KEY": "ect_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop.

### Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "earningscalls": {
      "command": "npx",
      "args": ["-y", "@earningscalls/mcp-server"],
      "env": {
        "EARNINGSCALLS_API_KEY": "ect_your_key_here"
      }
    }
  }
}
```

---

## Available Tools

| Tool | Description |
|---|---|
| `get_dataset_stats` | Total counts and date range — call first to understand coverage. |
| `list_latest_calls` | Most recent calls, optionally filtered by sector. |
| `list_calls_by_ticker` | All calls for a specific ticker (e.g. `PLTR`, `AAPL`). |
| `list_upcoming_earnings` | Scheduled calls in the next N days. |
| `get_transcript` | Full text of a call — format `full`, `summary`, or `components`. |
| `get_speaker_segments` | Structured speaker segments with role filter (Executive / Analyst / Operator). |
| `search_transcripts` | Full-text search across all transcripts and speaker segments. |

---

## Environment Variables

| Variable | Required | Default |
|---|---|---|
| `EARNINGSCALLS_API_KEY` | **yes** | — |
| `EARNINGSCALLS_BASE_URL` | no | `https://earningscalls.dev` |

---

## What to expect on startup

The server runs a preflight check against `GET /api/v1/me` before accepting any tool calls. On a successful start you'll see a banner in your MCP client's log panel:

```
┌───────────────────────────────────────────────────────────────┐
│ ✓  EarningsCalls MCP — connected                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   Plan       : Pro                                            │
│   Usage      : 342 / 5,000 this month                         │
│   Auth       : direct                                         │
│   Endpoint   : https://earningscalls.dev                      │
│                                                               │
│   Ready to serve tool calls.                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

If your key is missing, invalid, or on the free tier, a matching error banner is printed and the process exits with code 1. Your MCP client will mark the server as disconnected. Subscribe or fix the key, then restart the client.

---

## Development

```bash
npm install
npm run build
npm start
```

Source layout:

```
src/
├── index.ts      # stdio entry + preflight
├── server.ts     # n/a — server is constructed inline in index.ts
├── client.ts     # HTTP client for earningscalls.dev API
├── config.ts     # env var loading
├── messages.ts   # user-facing banners + error hints
└── tools.ts      # MCP tool definitions
```

---

## License

MIT
