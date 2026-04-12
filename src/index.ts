#!/usr/bin/env node
/**
 * EarningsCalls MCP Server — stdio entry point.
 *
 * On startup:
 *   1. Load config from env vars.
 *   2. Run preflight: call /api/v1/me to verify the API key.
 *      - no key        → print banner, exit 1
 *      - invalid key   → print banner, exit 1
 *      - free / test   → print banner, exit 1 (MCP is paid-only)
 *      - paid tier     → print connected banner and start server
 *   3. Register tools.
 *   4. Connect to stdio transport.
 *
 * All user-visible output goes to STDERR. stdout is reserved for
 * the JSON-RPC protocol between this process and the MCP client
 * (Claude Desktop, Claude Code, Cursor, etc.).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { EarningsCallsClient, ApiError } from './client.js';
import {
  noApiKeyBanner,
  invalidKeyBanner,
  freeTierBanner,
  connectedBanner,
} from './messages.js';
import { registerTools } from './tools.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const config = loadConfig();

  // ---- Preflight #1: API key present? ----
  if (!config.apiKey) {
    process.stderr.write(noApiKeyBanner(config) + '\n');
    process.exit(1);
  }

  // ---- Preflight #2: API key valid + paid tier? ----
  const client = new EarningsCallsClient(config);
  let me;
  try {
    me = await client.getMe();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.code === 'UNAUTHORIZED')) {
      process.stderr.write(invalidKeyBanner(config) + '\n');
      process.exit(1);
    }
    // Any other error: print and exit with diagnostic message.
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`EarningsCalls MCP: preflight failed — ${msg}\n`);
    process.stderr.write(`If this persists, check ${config.baseUrl}/health and your network connection.\n`);
    process.exit(1);
  }

  const { tier, tier_name, is_paid, is_test_key, usage, limits, auth_method } = me.data;

  if (!is_paid || is_test_key) {
    process.stderr.write(freeTierBanner(config, tier_name || tier) + '\n');
    process.exit(1);
  }

  // ---- Preflight OK — start server ----
  process.stderr.write(
    connectedBanner(config, {
      tierName: tier_name || tier,
      requestsMonth: usage.requests_month,
      limitMonth: limits.requests_per_month,
      authMethod: auth_method,
    }) + '\n',
  );

  const server = new McpServer(
    { name: '@earningscalls/mcp-server', version: VERSION },
    {
      instructions:
        'This server exposes the EarningsCalls.dev REST API as MCP tools. ' +
        'You can search earnings call transcripts, fetch full text, get speaker ' +
        'segments (cleanly separated Executive / Analyst / Operator), list calls ' +
        'by ticker, and look up upcoming earnings. Always call get_dataset_stats ' +
        'first if the user asks about date ranges or coverage — the dataset may ' +
        'not go back as far as a user expects. For company lookups prefer ' +
        'list_calls_by_ticker over free-text search. Transcripts can be large; ' +
        'use format="summary" or get_speaker_segments with a role filter to ' +
        'keep token usage reasonable.',
    },
  );

  registerTools(server, client, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Note: we do NOT print "running" here because McpServer.connect()
  // only resolves after the client disconnects or the process ends.
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`EarningsCalls MCP: fatal error\n${msg}\n`);
  process.exit(1);
});
