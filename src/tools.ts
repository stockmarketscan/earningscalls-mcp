/**
 * MCP tool definitions for EarningsCalls.dev.
 *
 * Every tool is a thin wrapper around a single REST API endpoint.
 * On error, we return a text response with a contextual hint
 * (e.g. upgrade/subscribe link) so the AI agent can relay it to
 * the user instead of silently failing.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Config } from './config.js';
import type { EarningsCallsClient } from './client.js';
import { ApiError } from './client.js';
import { formatToolError } from './messages.js';

type TextContent = { type: 'text'; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(error: unknown, config: Config): ToolResult {
  if (error instanceof ApiError) {
    return { content: [{ type: 'text', text: formatToolError(error, config) }], isError: true };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: `Unexpected error: ${msg}` }], isError: true };
}

export function registerTools(
  server: McpServer,
  client: EarningsCallsClient,
  config: Config,
): void {
  // ---------- get_dataset_stats ----------
  server.registerTool(
    'get_dataset_stats',
    {
      title: 'Get Dataset Stats',
      description:
        'Return overall statistics about the EarningsCalls dataset: total number of calls, transcripts, speaker segments, companies, sector count and the earliest / latest call date available. Use this first to understand scope and date coverage before querying specific calls.',
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.getStats();
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- list_latest_calls ----------
  server.registerTool(
    'list_latest_calls',
    {
      title: 'List Latest Earnings Calls',
      description:
        'List the most recent earnings calls available. Optional sector filter (e.g. "Information Technology", "Financials"). Use this to discover what happened recently in the market or a specific sector.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe('Number of calls to return (default 20).'),
        sector: z.string().optional().describe('Optional GICS sector filter, e.g. "Information Technology".'),
      },
    },
    async ({ limit, sector }) => {
      try {
        const data = await client.listLatestEarnings({ limit, sector });
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- list_calls_by_ticker ----------
  server.registerTool(
    'list_calls_by_ticker',
    {
      title: 'List Earnings Calls by Ticker',
      description:
        'Get all earnings calls for a specific stock ticker (e.g. "PLTR", "AAPL", "MSFT"). Returns company metadata plus the list of calls sorted newest-first. Use this to get the history of a single company.',
      inputSchema: {
        ticker: z.string().min(1).max(15).describe('Stock ticker symbol, e.g. "PLTR" or "AAPL".'),
      },
    },
    async ({ ticker }) => {
      try {
        const data = await client.listCallsByTicker(ticker);
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- get_transcript ----------
  server.registerTool(
    'get_transcript',
    {
      title: 'Get Full Transcript',
      description:
        'Fetch the full text of an earnings call transcript by its id (get the id from list_calls_by_ticker or list_latest_calls). Use format "summary" for just a preview, "full" for the entire transcript (default), or "components" for the structured header + section breakdown (Prepared Remarks vs Q&A).',
      inputSchema: {
        earnings_id: z.number().int().positive().describe('Internal id of the earnings call.'),
        format: z.enum(['full', 'summary', 'components']).optional().describe('Response format (default "full").'),
      },
    },
    async ({ earnings_id, format }) => {
      try {
        const data = await client.getTranscript(earnings_id, format);
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- get_speaker_segments ----------
  server.registerTool(
    'get_speaker_segments',
    {
      title: 'Get Speaker Segments',
      description:
        'Get the structured speaker segments for an earnings call: who said what, with their role (Executive, Analyst, Operator). Use role filter to narrow down, e.g. "analyst" to extract only the Q&A questions or "executive" for only management responses.',
      inputSchema: {
        earnings_id: z.number().int().positive().describe('Internal id of the earnings call.'),
        role: z.string().optional().describe('Optional speaker role filter, e.g. "executive", "analyst", "operator".'),
        limit: z.number().int().min(1).max(500).optional().describe('Max segments to return.'),
      },
    },
    async ({ earnings_id, role, limit }) => {
      try {
        const data = await client.getSpeakers(earnings_id, { role, limit });
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- search_transcripts ----------
  server.registerTool(
    'search_transcripts',
    {
      title: 'Full-Text Search Transcripts',
      description:
        'Run a full-text search across all earnings call transcripts and speaker segments. Returns matching calls with relevance-ranked snippets. Use this to find mentions of products, executives, themes, guidance phrases, etc. across the whole dataset.',
      inputSchema: {
        q: z.string().min(2).describe('Search query, e.g. "margin pressure" or "AI demand".'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results to return.'),
        from: z.string().optional().describe('Earliest date (YYYY-MM-DD).'),
        to: z.string().optional().describe('Latest date (YYYY-MM-DD).'),
      },
    },
    async ({ q, limit, from, to }) => {
      try {
        const data = await client.search({ q, limit, from, to });
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );

  // ---------- list_upcoming_earnings ----------
  server.registerTool(
    'list_upcoming_earnings',
    {
      title: 'List Upcoming Earnings',
      description:
        'Get scheduled earnings calls that have not yet happened. Useful for preparing research before a call or identifying imminent catalysts. Optionally filter by ticker.',
      inputSchema: {
        days: z.number().int().min(1).max(60).optional().describe('How many days ahead to look (default 14).'),
        ticker: z.string().optional().describe('Optional ticker filter.'),
      },
    },
    async ({ days, ticker }) => {
      try {
        const data = await client.listUpcoming({ days, ticker });
        return ok(data);
      } catch (e) {
        return err(e, config);
      }
    },
  );
}
