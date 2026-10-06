import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import dns from 'dns';
import ipaddr from 'ipaddr.js';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 20;

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function getTokenHash(req: NextRequest | Request): string {
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = req.headers.get('x-api-token') || '';
  const rawToken = bearerToken || headerToken || 'unauthenticated';

  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function verifyApiToken(req: NextRequest | Request): boolean {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      const isAllowUnauthenticated = process.env.ALLOW_UNAUTHENTICATED === 'true' || process.env.ALLOW_UNAUTHENTICATED === '1';
      if (!isAllowUnauthenticated) {
        console.error(
          '[GÜVENLİK HATASI] Production ortamında API_ACCESS_TOKEN ayarlanmalıdır veya kimlik doğrulamasız mod için ALLOW_UNAUTHENTICATED=true açıkça verilmelidir.'
        );
        return false;
      }
    }
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

  // Rate limiting priority:
  // Key rate limit strictly by verified token hash or by trusted client IP.
  // Never key on arbitrary unverified x-api-token header values to prevent pool pollution or limit bypass.
  let key: string;
  if (configuredToken && isValidToken) {
    const tokenHash = getTokenHash(req).slice(0, 16);
    key = `verified_token:${tokenHash}:${urlPath}`;
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
  '169.254.169.254', // AWS / GCP / Azure metadata IP
  '169.254.170.2',   // AWS ECS task metadata IP
  '100.100.100.200', // Alibaba Cloud metadata IP
  '168.63.129.16',  // Azure metadata IP
  '100.64.0.1',      // CGNAT gateway / metadata IP
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

export interface PinnedTarget {
  pinnedUrl: string;
  hostHeader: string;
}

export async function resolveAndValidateTarget(
  baseUrlString: string,
  targetPath: string
): Promise<{ success: true; pinnedUrl: string; hostHeader: string } | { success: false; error: string }> {
  try {
    if (baseUrlString.includes('?') || baseUrlString.includes('#') || baseUrlString.includes('@')) {
      return { success: false, error: 'BaseUrl sorgu (?), fragment (#) veya kullanıcı bilgisi (@) içeremez.' };
    }

    const parsed = new URL(baseUrlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { success: false, error: 'Yalnızca HTTP ve HTTPS protokolleri desteklenmektedir.' };
    }

    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      return { success: false, error: 'BaseUrl yol (path) içeremez; yalnızca origin girilmelidir.' };
    }

    let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    const allowPrivate = process.env.ALLOW_PRIVATE_IPS === 'true' || process.env.ALLOW_PRIVATE_IPS === '1';
    const allowList = process.env.OPEN_NOTEBOOK_ALLOW_LIST
      ? process.env.OPEN_NOTEBOOK_ALLOW_LIST.split(',').map((h) => h.trim().toLowerCase())
      : [];

    const portStr = parsed.port ? `:${parsed.port}` : '';
    const hostWithPort = `${hostname}${portStr}`;

    if (BLOCKED_METADATA_HOSTS.has(hostname) || BLOCKED_METADATA_IPS.has(hostname)) {
      return {
        success: false,
        error: 'Güvenlik nedeniyle belirtilen hedef adrese erişim engellendi (SSRF koruması).',
      };
    }

    const isExplicitlyAllowed = allowList.includes(hostname) || allowList.includes(hostWithPort);

    let resolvedIp: string;

    if (ipaddr.isValid(hostname)) {
      if (!isExplicitlyAllowed && isBlockedIpAddress(hostname, allowPrivate)) {
        return {
          success: false,
          error: 'Güvenlik nedeniyle belirtilen hedef IP adresine erişim engellendi (SSRF koruması).',
        };
      }
      resolvedIp = hostname;
    } else {
      if (!allowPrivate && !isExplicitlyAllowed) {
        if (hostname === 'localhost' || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
          return {
            success: false,
            error: 'Güvenlik nedeniyle iç ağ alan adlarına erişim engellendi (SSRF koruması).',
          };
        }
      }

      try {
        const addresses = await dns.promises.lookup(hostname, { all: true });
        if (!addresses || addresses.length === 0) {
          if (isExplicitlyAllowed) {
            resolvedIp = hostname;
          } else {
            return { success: false, error: 'Hedef sunucu alan adı çözümlenemedi.' };
          }
        } else {
          for (const addr of addresses) {
            if (!isExplicitlyAllowed && isBlockedIpAddress(addr.address, allowPrivate)) {
              return {
                success: false,
                error: 'Güvenlik nedeniyle belirtilen hedef adrese erişim engellendi (SSRF koruması).',
              };
            }
          }
          resolvedIp = addresses[0].address;
        }
      } catch (err) {
        if (isExplicitlyAllowed) {
          resolvedIp = hostname;
        } else {
          return { success: false, error: 'Hedef sunucu DNS çözümleme hatası.' };
        }
      }
    }

    const formattedIp =
      ipaddr.isValid(resolvedIp) && ipaddr.parse(resolvedIp).kind() === 'ipv6'
        ? `[${resolvedIp}]`
        : resolvedIp;

    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

    // For HTTPS targets, keep original domain in URL for TLS SNI cert validation;
    // all resolved IPs behind hostname have already been validated above.
    // For HTTP targets, use pinned IP in URL to prevent DNS Rebinding.
    const pinnedUrl = parsed.protocol === 'https:' && !ipaddr.isValid(hostname)
      ? `${parsed.protocol}//${parsed.host}${cleanPath}`
      : `${parsed.protocol}//${formattedIp}${portStr}${cleanPath}`;

    return { success: true, pinnedUrl, hostHeader: hostWithPort };
  } catch {
    return { success: false, error: 'Geçersiz hedef URL adresi.' };
  }
}

export async function isBlockedUrl(urlString: string): Promise<boolean> {
  const result = await resolveAndValidateTarget(urlString, '/');
  return !result.success;
}
