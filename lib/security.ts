import net from 'net';
import dns from 'dns/promises';

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
