import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import dns from 'dns';
import ipaddr from 'ipaddr.js';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 20;

if (process.env.NODE_ENV === 'production') {
  const isAllowUnauthenticated = process.env.ALLOW_UNAUTHENTICATED === 'true' || process.env.ALLOW_UNAUTHENTICATED === '1';
  if (!process.env.API_ACCESS_TOKEN && !isAllowUnauthenticated) {
    throw new Error(
      '[GÜVENLİK HATASI] Production ortamında API_ACCESS_TOKEN ayarlanmalıdır veya kimlik doğrulamasız mod için ALLOW_UNAUTHENTICATED=true açıkça verilmelidir.'
    );
  }
  if (!process.env.API_ACCESS_TOKEN) {
    console.warn('[GÜVENLİK UYARISI] ALLOW_UNAUTHENTICATED=true olarak ayarlandı. Sunucu kimlik doğrulaması olmadan çalışıyor!');
  }
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function verifyApiToken(req: NextRequest | Request): boolean {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) {
    return true;
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = req.headers.get('x-api-token') || '';

  if (bearerToken && safeCompare(bearerToken, token)) return true;
  if (headerToken && safeCompare(headerToken, token)) return true;

  return false;
}

export function checkRateLimit(req: NextRequest | Request, limit = DEFAULT_MAX_REQUESTS): boolean {
  const isValidToken = verifyApiToken(req);
  const configuredToken = process.env.API_ACCESS_TOKEN;

  let clientIp = 'anonymous';
  if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      clientIp = forwardedFor.split(',')[0].trim();
    } else {
      clientIp = req.headers.get('x-real-ip') || 'anonymous';
    }
  }

  const urlPath = new URL(req.url).pathname;

  // If a token is configured and the request supplied a valid token, key rate limit by verified token.
  // Otherwise, key rate limit strictly by verified client IP (or unverified indicator) to prevent rate limit bypass via random token headers.
  let key: string;
  if (configuredToken && isValidToken) {
    key = `verified_token:${urlPath}`;
  } else {
    key = `ip:${clientIp}:${urlPath}`;
  }

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

const BLOCKED_METADATA_IPS = new Set([
  '169.254.169.254',
  '100.100.100.200', // Alibaba Cloud metadata
  '168.63.129.16',  // Azure metadata
  '100.64.0.1',      // CGNAT gateway / metadata
]);

const BLOCKED_METADATA_HOSTS = new Set([
  'metadata.google.internal',
]);

const BLOCKED_IP_RANGES = new Set([
  'loopback',
  'private',
  'linkLocal',
  'uniqueLocal',
  'carrierGradeNat',
  'unspecified',
  'broadcast',
  'multicast',
  'reserved',
]);

function extractIPv4FromIPv6(ipString: string): string | null {
  try {
    const addr = ipaddr.parse(ipString);
    if (addr.kind() !== 'ipv6') return null;
    const ipv6 = addr as ipaddr.IPv6;

    if (ipv6.isIPv4MappedAddress()) {
      return ipv6.toIPv4Address().toString();
    }

    const parts = ipv6.parts;
    // NAT64 Well-Known Prefix 64:ff9b::/96
    if (parts[0] === 0x0064 && parts[1] === 0xff9b && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0) {
      const ip1 = parts[6] >> 8;
      const ip2 = parts[6] & 0xff;
      const ip3 = parts[7] >> 8;
      const ip4 = parts[7] & 0xff;
      return `${ip1}.${ip2}.${ip3}.${ip4}`;
    }

    // 6to4 Prefix 2002::/16
    if (parts[0] === 0x2002) {
      const ip1 = parts[1] >> 8;
      const ip2 = parts[1] & 0xff;
      const ip3 = parts[2] >> 8;
      const ip4 = parts[2] & 0xff;
      return `${ip1}.${ip2}.${ip3}.${ip4}`;
    }

    // IPv4-compatible (::x.x.x.x)
    if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0 && parts[4] === 0 && parts[5] === 0 && (parts[6] !== 0 || parts[7] !== 0) && !(parts[6] === 0 && parts[7] === 1)) {
      const ip1 = parts[6] >> 8;
      const ip2 = parts[6] & 0xff;
      const ip3 = parts[7] >> 8;
      const ip4 = parts[7] & 0xff;
      return `${ip1}.${ip2}.${ip3}.${ip4}`;
    }
  } catch {
    return null;
  }
  return null;
}

function isBlockedIpAddress(ipString: string, allowPrivate: boolean): boolean {
  if (BLOCKED_METADATA_IPS.has(ipString)) {
    return true;
  }

  if (!ipaddr.isValid(ipString)) {
    return true; // Invalid IP addresses are blocked
  }

  try {
    let addr = ipaddr.parse(ipString);

    if (addr.kind() === 'ipv6') {
      const embedded = extractIPv4FromIPv6(ipString);
      if (embedded && isBlockedIpAddress(embedded, allowPrivate)) {
        return true;
      }
      if ((addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        addr = (addr as ipaddr.IPv6).toIPv4Address();
      }
    }

    const range = addr.range();

    if (!allowPrivate && BLOCKED_IP_RANGES.has(range)) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

export async function isBlockedUrl(urlString: string): Promise<boolean> {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    // Normalize hostname: strip IPv6 brackets and trailing dot
    let hostname = parsed.hostname.toLowerCase();
    hostname = hostname.replace(/\.+$/, '');
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    if (BLOCKED_METADATA_HOSTS.has(hostname) || BLOCKED_METADATA_IPS.has(hostname)) {
      return true;
    }

    const allowPrivate = process.env.ALLOW_PRIVATE_IPS === 'true' || process.env.ALLOW_PRIVATE_IPS === '1';
    const allowList = process.env.OPEN_NOTEBOOK_ALLOW_LIST
      ? process.env.OPEN_NOTEBOOK_ALLOW_LIST.split(',').map((h) => h.trim().toLowerCase())
      : [];

    // Check allow list by hostname or host:port
    const hostWithPort = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    if (allowList.includes(hostname) || allowList.includes(hostWithPort)) {
      if (ipaddr.isValid(hostname)) {
        return isBlockedIpAddress(hostname, true);
      }
      return false;
    }

    // If hostname is directly an IP address
    if (ipaddr.isValid(hostname)) {
      return isBlockedIpAddress(hostname, allowPrivate);
    }

    // Block known internal hostname patterns if private IPs are disabled
    if (!allowPrivate) {
      if (hostname === 'localhost' || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
        return true;
      }
    }

    // Resolve DNS to verify all IP addresses behind the hostname
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return true;
      }

      for (const addr of addresses) {
        if (isBlockedIpAddress(addr.address, allowPrivate)) {
          return true;
        }
      }
    } catch {
      // DNS lookup failure -> block for safety
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
