#!/usr/bin/env node
/**
 * EarningsCalls MCP Server — Streamable HTTP entry point.
 *
 * Runs as a remote HTTP server (e.g. on Railway) so MCP clients can
 * connect via URL instead of running a local process.
 *
 * Each connecting client provides their own API key via the X-API-Key
 * header. The server creates a per-session EarningsCallsClient that
 * forwards all requests to the earningscalls.dev REST API.
 *
 * Supports stateful sessions (session ID tracking) and stateless mode.
 */

import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { EarningsCallsClient } from './client.js';
import { registerTools } from './tools.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE_URL = (process.env.EARNINGSCALLS_BASE_URL || 'https://earningscalls.dev').replace(/\/$/, '');
const VERSION = '0.1.0';

interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

const sessions = new Map<string, Session>();

function extractApiKey(req: http.IncomingMessage): string | undefined {
  const header = req.headers['x-api-key'];
  if (Array.isArray(header)) return header[0];
  if (header) return header;

  // Also check Authorization: Bearer ect_...
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

  return undefined;
}

function createSessionServer(apiKey: string): McpServer {
  const config = {
    apiKey,
    baseUrl: BASE_URL,
    pricingUrl: `${BASE_URL}/#pricing`,
    subscribeUrl: `${BASE_URL}/#pricing`,
  };
  const client = new EarningsCallsClient(config);

  const server = new McpServer(
    { name: '@earningscalls/mcp-server', version: VERSION },
    {
      instructions:
        'This server exposes the EarningsCalls.dev REST API as MCP tools. ' +
        'You can search earnings call transcripts, fetch full text, get speaker ' +
        'segments (cleanly separated Executive / Analyst / Operator), list calls ' +
        'by ticker, and look up upcoming earnings. Always call get_dataset_stats ' +
        'first if the user asks about date ranges or coverage. For company lookups ' +
        'prefer list_calls_by_ticker over free-text search. Transcripts can be large; ' +
        'use format="summary" or get_speaker_segments with a role filter to ' +
        'keep token usage reasonable.',
    },
  );

  registerTools(server, client, config);
  return server;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok', server: '@earningscalls/mcp-server', version: VERSION, sessions: sessions.size });
    return;
  }

  // Only /mcp endpoint
  if (req.url !== '/mcp') {
    sendJson(res, 404, { error: 'Not Found', hint: 'MCP endpoint is at /mcp' });
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // --- POST /mcp ---
  if (req.method === 'POST') {
    const bodyText = await readBody(req);
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON' });
      return;
    }

    // Existing session
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res, body);
      return;
    }

    // New session — must be initialize request
    if (!sessionId && isInitializeRequest(body)) {
      const apiKey = extractApiKey(req);
      if (!apiKey) {
        sendJson(res, 401, {
          error: 'API key required',
          message: 'Pass your EarningsCalls API key via X-API-Key header or Authorization: Bearer header.',
          subscribe: `${BASE_URL}/#pricing`,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          sessions.set(sid, { transport, server: mcpServer });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      const mcpServer = createSessionServer(apiKey);
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    sendJson(res, 400, { error: 'Bad request. Send an MCP initialize request to start a session.' });
    return;
  }

  // --- GET /mcp (SSE stream for existing session) ---
  if (req.method === 'GET') {
    if (!sessionId || !sessions.has(sessionId)) {
      sendJson(res, 400, { error: 'Invalid or missing session ID' });
      return;
    }
    await sessions.get(sessionId)!.transport.handleRequest(req, res);
    return;
  }

  // --- DELETE /mcp (close session) ---
  if (req.method === 'DELETE') {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close();
      sessions.delete(sessionId);
    }
    res.writeHead(200);
    res.end();
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`EarningsCalls MCP server (HTTP) listening on port ${PORT}`);
  console.log(`  Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  Health:   http://localhost:${PORT}/health`);
});
