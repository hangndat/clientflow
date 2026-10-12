import { config } from "dotenv";

// Load local secrets for credentialed integration tests only.
// Pre-exported env (release gate / local supabase) wins — dotenv does not override.
// GitHub Actions secretless CI has no .env.local, so suites stay skipped there.
if (process.env.SKIP_DOTENV !== "1") {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url.includes("example.supabase.co")) {
  // Treat CI placeholder URL as "no live database".
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
