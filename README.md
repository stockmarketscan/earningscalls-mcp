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

Two modes: **Remote** (hosted, zero install) or **Local** (via npx).

### Remote (recommended)

No install required. Point your MCP client at the hosted endpoint:

#### Claude Code (CLI)

```bash
claude mcp add earningscalls --transport http https://mcp.earningscalls.dev/mcp \
  --header "X-API-Key: ect_your_key_here"
```

#### Claude Desktop

```json
{
  "mcpServers": {
    "earningscalls": {
      "url": "https://mcp.earningscalls.dev/mcp",
      "headers": {
        "X-API-Key": "ect_your_key_here"
      }
    }
  }
}
```

#### Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "earningscalls": {
      "url": "https://mcp.earningscalls.dev/mcp",
      "headers": {
        "X-API-Key": "ect_your_key_here"
      }
    }
  }
}
```

### Local (via npx)

Runs the server as a local process using stdio transport:

#### Claude Code (CLI)

```bash
claude mcp add earningscalls \
  --env EARNINGSCALLS_API_KEY=ect_your_key_here \
  -- npx -y @earningscalls/mcp-server
```

#### Claude Desktop

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

#### Cursor

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

### Local mode (stdio)

| Variable | Required | Default |
|---|---|---|
| `EARNINGSCALLS_API_KEY` | **yes** | — |
| `EARNINGSCALLS_BASE_URL` | no | `https://earningscalls.dev` |

### Remote mode (HTTP)

| Variable | Required | Default |
|---|---|---|
| `PORT` | no | `3000` |
| `EARNINGSCALLS_BASE_URL` | no | `https://earningscalls.dev` |

In remote mode, the API key is provided per-session by the connecting client via `X-API-Key` header.

---

## Development

```bash
npm install
npm run build

# Local stdio mode
npm start

# Remote HTTP mode
npm run serve
```

Source layout:

```
src/
├── index.ts      # stdio entry + preflight (local mode)
├── http.ts       # Streamable HTTP entry (remote mode)
├── client.ts     # HTTP client for earningscalls.dev API
├── config.ts     # env var loading
├── messages.ts   # user-facing banners + error hints
└── tools.ts      # MCP tool definitions
```

---

## License

MIT
