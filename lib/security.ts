import net from 'net';
import dns from 'dns/promises';
import crypto from 'crypto';

/**
 * Extract token from Authorization header or x-api-token header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers.get('x-api-token');
  if (customHeader) {
    return customHeader.trim();
  }
  return null;
}

/**
 * Verify API access token against process.env.API_ACCESS_TOKEN
 */
export function verifyApiToken(req: Request): boolean {
  const expectedToken = process.env.API_ACCESS_TOKEN;
  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNAUTHENTICATED !== 'true') {
      return false;
    }
    return true;
  }
  const token = extractToken(req);
  return token === expectedToken;
}

/**
 * Validate API token and return result object
 */
export function validateApiToken(req: Request): { valid: boolean; status?: number; error?: string } {
  const expectedToken = process.env.API_ACCESS_TOKEN;
  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNAUTHENTICATED !== 'true') {
      return { valid: false, status: 401, error: 'Unauthorized: Production requires API_ACCESS_TOKEN' };
    }
    return { valid: true };
  }
  const token = extractToken(req);
  if (!token || token !== expectedToken) {
    return { valid: false, status: 401, error: 'Unauthorized: Invalid or missing token' };
  }
  return { valid: true };
}

/**
 * Get SHA-256 hash of token for session scoping
 */
export function getTokenHash(req: Request): string {
  const token = extractToken(req);
  if (!token) return 'anonymous';
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Simple in-memory rate limiter per IP / URL
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  if (process.env.TRUST_PROXY === 'true') {
    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export function checkRateLimit(req: Request, limit = 60, windowMs = 60000): boolean {
  const clientIp = getClientIp(req);
  const key = `${clientIp}:${req.url}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) {
    return true;
  }
  return false;
}

/**
 * Gömülü IPv4 adreslerini (IPv4-mapped, NAT64, 6to4 vb.) çıkarır
 */
function extractEmbeddedIPv4(ip: string): string | null {
  // IPv4-mapped IPv6 (::ffff:192.168.1.1 veya ::ffff:c0a8:0101)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const parts = ip.split(':');
    const lastPart = parts[parts.length - 1];
    if (net.isIPv4(lastPart)) return lastPart;
  }

  // NAT64 Well-Known Prefix (64:ff9b::192.168.1.1)
  if (ip.toLowerCase().startsWith('64:ff9b::')) {
    const remaining = ip.substring(9);
    if (net.isIPv4(remaining)) return remaining;
  }

  // 6to4 Prefix (2002:c0a8:0101::)
  if (ip.toLowerCase().startsWith('2002:')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      const hex1 = parseInt(parts[1], 16);
      const hex2 = parseInt(parts[2], 16);
      if (!isNaN(hex1) && !isNaN(hex2)) {
        const p1 = (hex1 >> 8) & 0xff;
        const p2 = hex1 & 0xff;
        const p3 = (hex2 >> 8) & 0xff;
        const p4 = hex2 & 0xff;
        return `${p1}.${p2}.${p3}.${p4}`;
      }
    }
  }

  return null;
}

/**
 * Verilen IP adresinin özel/dahili ağda olup olmadığını kontrol eder
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Gömülü IPv4 adresi varsa çıkarıp kontrol et
  const embeddedv4 = extractEmbeddedIPv4(ip);
  if (embeddedv4) {
    return isPrivateOrReservedIP(embeddedv4);
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);

    // Loopback (127.0.0.0/8)
    if (parts[0] === 127) return true;
    // Private Class A (10.0.0.0/8)
    if (parts[0] === 10) return true;
    // Private Class B (172.16.0.0/12)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // Private Class C (192.168.0.0/16)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // Link-Local & AWS Metadata (169.254.0.0/16)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // CGNAT (100.64.0.0/10)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // Multicast (224.0.0.0/4)
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // Reserved (240.0.0.0/4)
    if (parts[0] >= 240) return true;
    // Broadcast / 0.0.0.0
    if (parts[0] === 0 || parts[0] === 255) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // Loopback (::1)
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unique Local Address (fc00::/7)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-Local (fe80::/10)
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || 
        normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    // Unspecified (::)
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    return false;
  }

  return true; // Geçersiz IP'leri varsayılan olarak engelle
}

/**
 * SSRF Kontrolü: Verilen URL'nin engellenip engellenmediğini döner
 */
export async function isBlockedUrl(targetUrl: string): Promise<boolean> {
  if (process.env.ALLOW_PRIVATE_IPS === 'true') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  const allowList = (process.env.MCP_ALLOW_LIST || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.includes(hostname)) {
    return false;
  }

  // Cloud metadata hostnames/IPs check
  const blockedMetadataHosts = [
    '169.254.169.254',
    '100.100.100.200',
    '168.63.129.16',
    'metadata.google.internal',
    'metadata.google.internal.',
  ];
  if (blockedMetadataHosts.includes(hostname)) {
    return true;
  }

  if (net.isIP(hostname)) {
    return isPrivateOrReservedIP(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) return true;
    for (const record of records) {
      if (isPrivateOrReservedIP(record.address)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Hostname çözümler, IP doğrulamasını yapar ve sabitlenmiş (pinned) IP döndürür.
 * DNS Rebinding koruması sağlar.
 */
export async function validateAndPinTargetUrl(rawUrl: string, allowPrivate: boolean = false) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Geçersiz URL formatı.');
  }

  // Yalnızca HTTP ve HTTPS protokollerine izin ver
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Desteklenmeyen protokol.');
  }

  // Path, Query, Fragment veya Auth enjeksiyonlarını engelle
  // Sadece temiz origin kabul edilir (örnek: http://example.com:8080)
  if (
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new Error('baseUrl yalnızca origin içermelidir (path, query veya fragment barındıramaz).');
  }

  const hostname = parsed.hostname;
  let targetIp = hostname;

  // Eğer hostname bir IP adresi değilse DNS çözümlemesi yap
  if (!net.isIP(hostname)) {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error('Domain adresi çözümlenemedi.');
    }

    // Çözümlenen TÜM IP adreslerini kontrol et
    for (const record of records) {
      if (!allowPrivate && isPrivateOrReservedIP(record.address)) {
        throw new Error(`Erişim engellendi: IP adresi (${record.address}) güvenli değil.`);
      }
    }
    // İlk doğrulanan IP'yi sabitle
    targetIp = records[0].address;
  } else {
    if (!allowPrivate && isPrivateOrReservedIP(hostname)) {
      throw new Error(`Erişim engellendi: IP adresi (${hostname}) güvenli değil.`);
    }
  }

  const port = parsed.port ? `:${parsed.port}` : (parsed.protocol === 'https:' ? ':443' : ':80');
  const isIPv6 = net.isIPv6(targetIp);
  const formattedIp = isIPv6 ? `[${targetIp}]` : targetIp;

  // Doğrulanmış ve sabitlenmiş IP bağlantı URL'i
  const pinnedUrl = `${parsed.protocol}//${formattedIp}${port}`;

  return {
    pinnedUrl,
    originalHost: parsed.host,
  };
}
