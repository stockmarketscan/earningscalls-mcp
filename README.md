# EarningsCalls MCP Server

[Website](https://earningscalls.dev) · [MCP setup guide](https://earningscalls.dev/mcp) · [API docs](https://earningscalls.dev/docs) · License: MIT

Model Context Protocol server that gives AI agents direct access to the [EarningsCalls.dev](https://earningscalls.dev) dataset — **177,000+ earnings call transcripts** from **17,000+ companies** across **70 countries** and **170+ exchanges** (2020 to present), with **11M+ speaker segments** cleanly tagged by role (Executive / Analyst / Operator / Attendee / Shareholder), full-text search, and more.

Ask Claude (or any MCP-capable client) about any earnings call in natural language:

> *"What did NVIDIA's CFO say about data center growth in their last call?"*
> *"Compare Tesla's gross-margin commentary across the last four quarters."*
> *"Find S&P 500 companies that mentioned 'tariffs' in their Q2 2026 calls."*

Built as a thin MCP wrapper around the public REST API at `https://earningscalls.dev/api/v1`. New calls land within minutes of the call ending.

---

## Requirements

- A **paid EarningsCalls subscription** (Pro, Ultra, or Enterprise). The free test key does not work here — grab a plan at [earningscalls.dev/#pricing](https://earningscalls.dev/#pricing) (from $24.99/month).
- For the local method only: **Node.js 18+**.

---

## Installation

Two remote options (zero install, recommended) and one local option.

### Option A — Connector URL (recommended)

The easiest path: a personal connector URL with the token embedded, so there's **no API-key header to manage**.

1. Go to [earningscalls.dev/dashboard](https://earningscalls.dev/dashboard) → **Connectors** → **Generate**.
2. Copy the URL — it looks like `https://earningscalls.dev/u/<your-token>/mcp`.

**Claude Desktop / claude.ai (web):** Settings → Connectors → **Add custom connector** → paste the URL → Add. (On the web, leave the OAuth fields empty and confirm the consent popup.)

**Claude Code (CLI):**

```bash
claude mcp add --transport http earningscalls "https://earningscalls.dev/u/<your-token>/mcp"
# add --scope user to make it available in every project
```

**Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "earningscalls": {
      "url": "https://earningscalls.dev/u/<your-token>/mcp"
    }
  }
}
```

Each connector URL is independently revocable — generate one per device or workspace.

### Option B — API-key header

Point your client at the hosted endpoint and pass your API key (`ect_...`) via the `X-API-Key` header.

**Claude Code (CLI):**

```bash
claude mcp add earningscalls --transport http https://mcp.earningscalls.dev/mcp \
  --header "X-API-Key: ect_your_key_here"
```

**Claude Desktop / Cursor** — config:

```json
{
  "mcpServers": {
    "earningscalls": {
      "url": "https://mcp.earningscalls.dev/mcp",
      "headers": { "X-API-Key": "ect_your_key_here" }
    }
  }
}
```

### Option C — Local (via npx)

Runs the server as a local process over stdio.

```bash
claude mcp add earningscalls \
  --env EARNINGSCALLS_API_KEY=ect_your_key_here \
  -- npx -y @earningscalls/mcp-server
```

Or in a client config:

```json
{
  "mcpServers": {
    "earningscalls": {
      "command": "npx",
      "args": ["-y", "@earningscalls/mcp-server"],
      "env": { "EARNINGSCALLS_API_KEY": "ect_your_key_here" }
    }
  }
}
```

---

## Coverage

| | |
|---|---|
| Earnings call transcripts | **177,000+** |
| Companies | **17,000+** |
| Countries / exchanges | **70 / 170+** |
| History | **2020 – present** (5+ years) |
| Speaker segments | **11M+** (Executive / Analyst / Operator / Attendee / Shareholder) |
| Sectors | All **11 GICS** sectors |
| Freshness | New calls within minutes of the call ending |

---

## Available Tools

| Tool | Description |
|---|---|
| `get_dataset_stats` | Total counts and date range — call first to understand coverage. |
| `list_latest_calls` | Most recent calls, optionally filtered by sector. |
| `list_recent_transcripts` | Recently added transcripts. |
| `list_calls_by_ticker` | All calls for a ticker (e.g. `PLTR`, `AAPL`), newest first. |
| `get_latest_call_for_ticker` | Single most recent call for a ticker. |
| `get_company_by_name` | Look up a company by full/partial name. |
| `list_companies` | Browse / search companies. |
| `list_upcoming_earnings` | Scheduled calls in the next N days. |
| `get_earnings_call` | Metadata for a single call. |
| `get_transcript` | Full text of a call — format `full`, `summary`, or `components`. |
| `get_speaker_segments` | Speaker segments with role filter (Executive / Analyst / Operator …). |
| `search_transcripts` | Full-text search across all transcripts and speaker segments. |
| `search_within_ticker` | Full-text search scoped to one ticker. |
| `list_sectors` / `list_industries` | Discover filter dimensions. |

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

In remote mode the API key is provided per session by the connecting client — either embedded in the connector URL (Option A) or via the `X-API-Key` header (Option B).

---

## Development

```bash
npm install
npm run build

npm start    # local stdio mode
npm run serve # remote HTTP mode
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
