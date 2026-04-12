/**
 * User-facing messages for the MCP server.
 *
 * IMPORTANT: All human-readable output from an MCP server MUST go to
 * stderr. stdout is reserved for the JSON-RPC protocol between the
 * server and the host (Claude Desktop, Claude Code, Cursor, etc).
 *
 * Claude Desktop / Cursor / Claude Code surface stderr output in
 * their MCP log panels so users see these messages when something
 * goes wrong.
 */

import type { Config } from './config.js';
import type { ApiError } from './client.js';

const BOX_TOP    = '┌───────────────────────────────────────────────────────────────┐';
const BOX_MID    = '├───────────────────────────────────────────────────────────────┤';
const BOX_BOT    = '└───────────────────────────────────────────────────────────────┘';
const BOX_SIDE   = '│ ';
const BOX_SIDE_R = ' │';

function box(title: string, lines: string[]): string {
  const out = [BOX_TOP];
  const pad = (s: string) => {
    // Width-aware-ish (treats each char as width 1; good enough for ASCII).
    const max = 61;
    if (s.length > max) return s.slice(0, max);
    return s + ' '.repeat(max - s.length);
  };
  out.push(BOX_SIDE + pad(title) + BOX_SIDE_R);
  out.push(BOX_MID);
  for (const line of lines) out.push(BOX_SIDE + pad(line) + BOX_SIDE_R);
  out.push(BOX_BOT);
  return out.join('\n');
}

/** Banner shown when no API key is set in env. */
export function noApiKeyBanner(config: Config): string {
  return box('⚠  EarningsCalls MCP — API key required', [
    '',
    'The MCP server requires a paid subscription to run.',
    '',
    '  1. Get an API key:',
    `     ${config.subscribeUrl}`,
    '',
    '  2. Set it in your MCP client config:',
    '     env: { EARNINGSCALLS_API_KEY: "ect_..." }',
    '',
    '  3. Restart your MCP client (Claude Desktop / Code / Cursor).',
    '',
    'Plans start at $24.99/month (Pro).',
    '',
  ]);
}

/** Banner shown when the API key is invalid or expired. */
export function invalidKeyBanner(config: Config): string {
  return box('✘  EarningsCalls MCP — invalid API key', [
    '',
    'Your EARNINGSCALLS_API_KEY was rejected by the server.',
    '',
    'This usually means:',
    '  • The key was revoked or expired',
    '  • The subscription was cancelled and the grace period ended',
    '  • There is a typo in your MCP client config',
    '',
    'Re-subscribe or manage your subscription at:',
    `  ${config.subscribeUrl}`,
    '',
  ]);
}

/** Banner shown when the API key maps to the free tier or the test key. */
export function freeTierBanner(config: Config, tierName: string): string {
  return box(`✘  EarningsCalls MCP — "${tierName}" plan not supported`, [
    '',
    'The MCP server is a paid feature and requires one of:',
    '',
    '  • Pro        $24.99 / month   5,000 requests',
    '  • Ultra      $39.99 / month  25,000 requests',
    '  • Enterprise   $299 / month 100,000 requests',
    '',
    `Your current plan: ${tierName}`,
    '',
    'Upgrade at:',
    `  ${config.subscribeUrl}`,
    '',
  ]);
}

/** Banner shown on successful preflight. */
export function connectedBanner(
  config: Config,
  info: {
    tierName: string;
    requestsMonth: number;
    limitMonth: number | null;
    authMethod: string;
  },
): string {
  const limitStr = info.limitMonth ? info.limitMonth.toLocaleString('en-US') : '∞';
  const usageStr = info.requestsMonth.toLocaleString('en-US');
  return box(`✓  EarningsCalls MCP — connected`, [
    '',
    `  Plan       : ${info.tierName}`,
    `  Usage      : ${usageStr} / ${limitStr} this month`,
    `  Auth       : ${info.authMethod}`,
    `  Endpoint   : ${config.baseUrl}`,
    '',
    '  Ready to serve tool calls.',
    '',
  ]);
}

/** Short contextual hint for per-tool runtime errors. */
export function toolErrorHint(err: ApiError, config: Config): string {
  switch (err.code) {
    case 'UNAUTHORIZED':
      return `Your API key was rejected. Re-subscribe or fix your key: ${config.subscribeUrl}`;
    case 'FORBIDDEN':
      return `This endpoint requires a higher plan. Upgrade: ${config.subscribeUrl}`;
    case 'RATE_LIMITED':
      return `Monthly request limit reached. Upgrade for higher limits: ${config.subscribeUrl}`;
    case 'NOT_FOUND':
      return `Not found on the server (${err.message}). Check the id/ticker and try again.`;
    case 'SERVER_ERROR':
      return `EarningsCalls API is having issues (HTTP ${err.status}). Please retry in a moment.`;
    case 'NETWORK_ERROR':
      return `Network error reaching EarningsCalls API. Check your connection.`;
    case 'NO_API_KEY':
      return `EARNINGSCALLS_API_KEY is not set. See ${config.subscribeUrl}`;
    default:
      return err.message;
  }
}

export function formatToolError(err: ApiError, config: Config): string {
  return `Error: ${err.message}\n\nHint: ${toolErrorHint(err, config)}`;
}
