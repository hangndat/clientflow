import { config } from "dotenv";

// Load local secrets for credentialed integration tests only.
// GitHub Actions has no .env.local, so RLS suites stay skipped there.
config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url.includes("example.supabase.co")) {
  // Treat CI placeholder URL as "no live database".
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
