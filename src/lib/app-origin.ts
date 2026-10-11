/**
 * Canonical public origin for auth email redirects.
 * Never derive this from spoofable request headers (Origin / Host / X-Forwarded-*).
 */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Fall through to env/error handling below.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_SITE_URL must be set to a valid http(s) origin in production",
  );
}
