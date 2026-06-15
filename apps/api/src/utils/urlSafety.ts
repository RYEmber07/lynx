// SSRF defense: blocks URLs pointing to internal infrastructure,
// loopback addresses, and cloud metadata endpoints.
// LIMITATION: only checks literal IP addresses in the URL string.
// A domain name that RESOLVES to a private IP (DNS rebinding) is
// not caught here - that requires a DNS lookup at request time.
// Acceptable for now: Lynx does not make server-side requests to
// originalUrl. Revisit if a link-preview/metadata-fetch feature
// is ever added.

/**
 * Returns true if the hostname is a loopback address, an unspecified address,
 * or falls within any private / link-local IPv4 or IPv6 range.
 *
 * Covered ranges:
 *   Loopback:    localhost, 127.x.x.x, ::1
 *   Unspecified: 0.0.0.0
 *   Private:     10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   Link-local:  169.254.0.0/16 (incl. AWS/GCP/Azure metadata: 169.254.169.254)
 *   IPv6 ULA:    fc00::/7  (fc00: and fd00:)
 *   IPv6 LL:     fe80::/10
 *
 * @param hostname - The hostname extracted from a parsed URL (no port, no brackets).
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // ---- Loopback / unspecified literals ----
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") {
    return true;
  }

  // ---- IPv6 (URL.hostname strips surrounding brackets) ----
  if (h.includes(":")) {
    return (
      h === "::1" ||
      h.startsWith("fc00:") ||
      h.startsWith("fd00:") || // fc00::/7 includes fd00::
      h.startsWith("fe80:")
    );
  }

  // ---- IPv4 literal: must be exactly four dot-separated decimal octets ----
  const parts = h.split(".");
  if (parts.length !== 4) {
    // Not an IPv4 literal (it's a hostname) - let it through
    return false;
  }

  const octets = parts.map(Number);

  // Reject if any octet is not a clean integer in [0, 255]
  for (let i = 0; i < octets.length; i++) {
    const o = octets[i]!;
    if (!Number.isInteger(o) || o < 0 || o > 255 || parts[i] === "") {
      return false; // malformed - not a real IP, let Zod's .url() handle it
    }
  }

  const [a, b] = octets as [number, number, number, number];

  // 127.0.0.0/8 - loopback range
  if (a === 127) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12 - 172.16.x.x through 172.31.x.x
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 - link-local (AWS/GCP/Azure metadata endpoints live here)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Returns true only if the URL string is safe to store as an external redirect target:
 *  - Must parse without error
 *  - Protocol must be http: or https:
 *  - Hostname must not be a private, loopback, or link-local address
 *
 * @param urlString - The raw URL string to validate.
 */
export function isSafeUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (isPrivateOrReservedHost(parsed.hostname)) {
    return false;
  }

  return true;
}
