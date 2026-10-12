import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("auth callback session cookies", () => {
  test.skip(
    !supabaseUrl || !serviceRoleKey,
    "Requires local/isolated Supabase credentials",
  );

  test("magic-link callback persists auth cookie and reaches onboarding", async ({
    page,
    context,
  }) => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `e2e-callback-${Date.now()}@example.com`;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: "e2e-password-12345",
        email_confirm: true,
      });
    expect(createError).toBeNull();

    try {
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
      expect(linkError).toBeNull();
      const hashedToken = linkData?.properties?.hashed_token;
      expect(hashedToken).toBeTruthy();

      const response = await page.goto(
        `/auth/callback?token_hash=${encodeURIComponent(hashedToken!)}&type=magiclink&next=/onboarding`,
      );
      expect(response?.ok() || response?.status() === 304).toBeTruthy();
      await expect(page).toHaveURL(/\/onboarding/);

      const cookies = await context.cookies();
      const authCookie = cookies.find((cookie) =>
        cookie.name.includes("auth-token"),
      );
      expect(authCookie).toBeTruthy();
      await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    } finally {
      if (created.user?.id) {
        await admin.auth.admin.deleteUser(created.user.id);
      }
    }
  });
});
