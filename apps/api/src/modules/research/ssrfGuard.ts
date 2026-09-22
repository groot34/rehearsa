import dns from 'dns';
import net from 'net';

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  url?: URL;
  resolvedIps?: string[];
}

/**
 * Helper to check if an IPv4 address string falls into private/loopback/link-local ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Helper to check if an IPv6 address string falls into private/loopback ranges.
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1)
  if (lower.startsWith('::ffff:') || lower.startsWith('0:0:0:0:0:ffff:')) {
    const ipv4Part = lower.split(':').pop() || '';
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  // Link-local fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Unique local fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  return false;
}

export function checkIpIsPrivate(ip: string, allowLoopback = false): boolean {
  if (net.isIPv4(ip)) {
    if (isPrivateIPv4(ip)) {
      if (allowLoopback && (ip.startsWith('127.') || ip === '127.0.0.1')) return false;
      return true;
    }
  }
  if (net.isIPv6(ip)) {
    if (isPrivateIPv6(ip)) {
      if (allowLoopback && ip === '::1') return false;
      return true;
    }
  }
  return false;
}

/**
 * Custom DNS lookup function for Node http/https Agents to prevent DNS Rebinding (TOCTOU).
 */
export function createSsrfLookup(allowLoopbackInDev = false) {
  return (hostname: string, options: any, callback?: any) => {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    }

    dns.lookup(hostname, opts, (err, address, family) => {
      if (err) return cb(err, address, family);

      const addresses = Array.isArray(address) ? address : [{ address, family }];
      for (const item of addresses) {
        const ip = typeof item === 'string' ? item : item.address;
        if (ip && checkIpIsPrivate(ip, allowLoopbackInDev)) {
          return cb(new Error(`SSRF Blocked at socket connection: IP ${ip} is private/forbidden`), '', 4);
        }
      }

      return cb(null, address, family);
    });
  };
}

/**
 * Validates a target URL string against SSRF attack vectors.
 */
export async function validateUrlSsrf(
  rawUrl: string,
  options?: { allowLoopbackInDev?: boolean }
): Promise<SsrfValidationResult> {
  const allowLoopback = options?.allowLoopbackInDev ?? false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL syntax' };
  }

  // 1. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Forbidden URL scheme: ${parsed.protocol}. Only http: and https: are allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject explicit localhost hostnames unless loopback is allowed in dev mode
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    if (!allowLoopback) {
      return { safe: false, reason: 'Localhost and loopback domain access is strictly prohibited.' };
    }
  }

  // If hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (checkIpIsPrivate(hostname, allowLoopback)) {
      return { safe: false, reason: `Private/loopback IP address prohibited: ${hostname}` };
    }

    return { safe: true, url: parsed, resolvedIps: [hostname] };
  }

  // 3. DNS Lookup for domain names
  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    const resolvedIps = lookupResults.map((res) => res.address);

    for (const ipInfo of lookupResults) {
      const ip = ipInfo.address;
      if (checkIpIsPrivate(ip, allowLoopback)) {
        return {
          safe: false,
          reason: `Domain ${hostname} resolved to forbidden private IP address: ${ip}`,
          resolvedIps,
        };
      }
    }

    return { safe: true, url: parsed, resolvedIps };
  } catch (err) {
    return { safe: false, reason: `DNS resolution failed for hostname: ${hostname} (${(err as Error).message})` };
  }
}

