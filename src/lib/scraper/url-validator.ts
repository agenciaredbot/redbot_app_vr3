/**
 * URL validation and SSRF prevention for the web scraper.
 */

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
];

export function validateScrapeUrl(url: string): {
  valid: boolean;
  sanitizedUrl: string;
  error?: string;
} {
  // Basic format check
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, sanitizedUrl: url, error: "URL inválida. Verifica el formato." };
  }

  // Only allow HTTP/HTTPS
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, sanitizedUrl: url, error: "Solo se permiten URLs HTTP o HTTPS." };
  }

  // Block private/internal hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, sanitizedUrl: url, error: "No se puede acceder a esta dirección." };
  }

  // Block private IP ranges
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return { valid: false, sanitizedUrl: url, error: "No se puede acceder a esta dirección." };
    }
  }

  // Block URLs with auth credentials
  if (parsed.username || parsed.password) {
    return { valid: false, sanitizedUrl: url, error: "URLs con credenciales no son permitidas." };
  }

  return { valid: true, sanitizedUrl: parsed.toString() };
}
