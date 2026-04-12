/**
 * Configuration loaded from environment variables.
 *
 * EARNINGSCALLS_API_KEY  — required, starts with "ect_"
 * EARNINGSCALLS_BASE_URL — optional, defaults to https://earningscalls.dev
 */

export interface Config {
  apiKey: string | undefined;
  baseUrl: string;
  pricingUrl: string;
  subscribeUrl: string;
}

export function loadConfig(): Config {
  const apiKey = process.env.EARNINGSCALLS_API_KEY?.trim() || undefined;
  const baseUrl = (process.env.EARNINGSCALLS_BASE_URL || 'https://earningscalls.dev').replace(/\/$/, '');

  return {
    apiKey,
    baseUrl,
    pricingUrl: `${baseUrl}/#pricing`,
    subscribeUrl: `${baseUrl}/#pricing`,
  };
}
