import { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 20;

export function checkRateLimit(req: NextRequest | Request, limit = DEFAULT_MAX_REQUESTS): boolean {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous';
  const urlPath = new URL(req.url).pathname;
  const key = `${clientIp}:${urlPath}`;

  const now = Date.now();

  // Periodic cleanup of expired entries
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
  }

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count += 1;
  return false;
}

export function verifyApiToken(req: NextRequest | Request): boolean {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) {
    // API access token is optional; if process.env.API_ACCESS_TOKEN is set, require it.
    return true;
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = req.headers.get('x-api-token') || '';

  return bearerToken === token || headerToken === token;
}

export function isBlockedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Always block cloud metadata services
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === '162.254.169.254'
    ) {
      return true;
    }

    const allowPrivate = process.env.ALLOW_PRIVATE_IPS === 'true' || process.env.ALLOW_PRIVATE_IPS === '1';
    const allowList = process.env.OPEN_NOTEBOOK_ALLOW_LIST
      ? process.env.OPEN_NOTEBOOK_ALLOW_LIST.split(',').map((h) => h.trim().toLowerCase())
      : [];

    if (allowList.includes(hostname)) {
      return false;
    }

    if (!allowPrivate) {
      // 127.0.0.0/8 or localhost
      if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
      }
      // 10.0.0.0/8
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
      }
      // 172.16.0.0/12
      if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
      }
      // 192.168.0.0/16
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
      }
      // 169.254.0.0/16
      if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}
