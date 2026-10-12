/**
 * Canonical public origin for auth email redirects.
 * Never derive this from spoofable request headers (Origin / Host / X-Forwarded-*).
 */

function parseHttpOrigin(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    return null;
  }

  return null;
}

function localhostOrigins(): string[] {
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

/**
 * Origins allowed for post-auth redirects.
 * Includes the canonical site URL, optional comma-separated AUTH_ALLOWED_ORIGINS,
 * Vercel preview URL when the platform sets VERCEL_URL, and localhost outside production.
 */
export function getAllowedRedirectOrigins(): string[] {
  const origins = new Set<string>();

  const canonical = parseHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (canonical) {
    origins.add(canonical);
  }

  const extra = process.env.AUTH_ALLOWED_ORIGINS ?? "";
  for (const part of extra.split(",")) {
    const origin = parseHttpOrigin(part);
    if (origin) {
      origins.add(origin);
    }
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost && !vercelHost.includes("://")) {
    const vercelOrigin = parseHttpOrigin(`https://${vercelHost}`);
    if (vercelOrigin) {
      origins.add(vercelOrigin);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    for (const origin of localhostOrigins()) {
      origins.add(origin);
    }
  }

  return [...origins];
}

export function getAppOrigin(): string {
  const configured = parseHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_SITE_URL must be set to a valid http(s) origin in production",
  );
}

/**
 * Pick a trusted redirect origin for auth callbacks.
 * Uses the request URL origin only when it appears on the configured allow-list;
 * otherwise falls back to the canonical app origin. Does not trust raw Host /
 * X-Forwarded-* headers beyond what Next already placed in request.url, and
 * never accepts an origin outside the allow-list.
 */
export function getTrustedRedirectOrigin(requestUrl: string | URL): string {
  const canonical = getAppOrigin();
  const allowed = new Set(getAllowedRedirectOrigins());
  // Ensure the canonical origin is always accepted even if allow-list parsing
  // omitted it due to env quirks.
  allowed.add(canonical);

  try {
    const requestOrigin = new URL(requestUrl).origin;
    if (allowed.has(requestOrigin)) {
      return requestOrigin;
    }
  } catch {
    // Fall through to canonical.
  }

  return canonical;
}
