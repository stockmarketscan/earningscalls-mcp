/**
 * HTTP client for the EarningsCalls.dev REST API.
 * Thin wrapper around fetch() with typed error responses.
 */

import type { Config } from './config.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface MeResponse {
  data: {
    tier: 'free' | 'pro' | 'ultra' | 'enterprise';
    tier_name: string;
    is_paid: boolean;
    is_test_key: boolean;
    limits: {
      requests_per_month: number | null;
      requests_per_day: number | null;
      rate_per_minute: number | null;
    };
    usage: {
      requests_today: number;
      requests_month: number;
    };
    features: string[];
    auth_method: 'test' | 'rapidapi' | 'direct';
  };
}

export class EarningsCallsClient {
  constructor(private config: Config) {}

  /**
   * Low-level GET. Throws ApiError on non-2xx responses, with codes:
   *   NO_API_KEY        — EARNINGSCALLS_API_KEY env var missing
   *   UNAUTHORIZED      — 401, invalid/expired key
   *   FORBIDDEN         — 403, tier-gated endpoint
   *   NOT_FOUND         — 404
   *   RATE_LIMITED      — 429
   *   SERVER_ERROR      — 5xx
   *   NETWORK_ERROR     — fetch() itself failed
   *   PARSE_ERROR       — response body was not valid JSON
   */
  async get<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    if (!this.config.apiKey) {
      throw new ApiError(0, 'NO_API_KEY', 'EARNINGSCALLS_API_KEY environment variable is not set.');
    }

    const url = new URL(path, this.config.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
      }
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Accept': 'application/json',
          'User-Agent': '@earningscalls/mcp-server',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ApiError(0, 'NETWORK_ERROR', `Network request failed: ${message}`);
    }

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiError(res.status, 'PARSE_ERROR', `Non-JSON response from ${path}: ${text.slice(0, 200)}`);
      }
    }

    if (res.ok) {
      return body as T;
    }

    const bodyObj = (body as { error?: string; message?: string } | null) ?? {};
    const serverMsg = bodyObj.message || bodyObj.error || `HTTP ${res.status}`;
    const code = (() => {
      switch (res.status) {
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 429: return 'RATE_LIMITED';
        default:  return res.status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR';
      }
    })();

    throw new ApiError(res.status, code, serverMsg, body);
  }

  // ---------- Typed endpoint helpers ----------

  getMe(): Promise<MeResponse> {
    return this.get<MeResponse>('/api/v1/me');
  }

  getStats() {
    return this.get('/api/v1/stats');
  }

  listLatestEarnings(params: { limit?: number; sector?: string } = {}) {
    return this.get('/api/v1/earnings/latest', params);
  }

  listCallsByTicker(ticker: string) {
    return this.get(`/api/v1/companies/ticker/${encodeURIComponent(ticker)}`);
  }

  getTranscript(earningsId: number, format: 'full' | 'summary' | 'components' = 'full') {
    return this.get(`/api/v1/transcripts/${earningsId}`, { format });
  }

  getSpeakers(earningsId: number, params: { role?: string; limit?: number } = {}) {
    return this.get(`/api/v1/speakers/${earningsId}`, params);
  }

  search(params: { q: string; limit?: number; from?: string; to?: string }) {
    return this.get('/api/v1/search', params);
  }

  listUpcoming(params: { days?: number; ticker?: string } = {}) {
    return this.get('/api/v1/earnings/upcoming', params);
  }
}
