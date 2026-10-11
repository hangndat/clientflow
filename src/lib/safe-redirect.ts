const DEFAULT_FALLBACK = "/dashboard";

/**
 * Validates post-auth redirect targets so they stay same-origin path navigations.
 * Rejects protocol-relative URLs, schemes, backslash tricks, and host injections.
 */
export function safeInternalPath(
  raw: unknown,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("\0")) {
    return fallback;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Normalize and reject obvious bypasses before URL parsing.
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("//") ||
    /[\r\n]/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const base = "http://clientflow.local";
    const parsed = new URL(decoded, base);

    if (parsed.origin !== base) {
      return fallback;
    }
    if (parsed.username || parsed.password) {
      return fallback;
    }

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\") ||
      path.includes("//")
    ) {
      return fallback;
    }

    return path;
  } catch {
    return fallback;
  }
}
