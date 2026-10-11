import Link from "next/link";

import { AuthForm } from "@/features/auth/components/auth-form";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#ccfbf1,_#f8fafc_45%)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
        <p className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-teal-800">
          ClientFlow
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Access your organization dashboard and client records.
        </p>
        {params.error ? (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            Authentication failed: {params.error}
          </p>
        ) : null}
        <div className="mt-6">
          <AuthForm mode="login" nextPath={params.next || "/dashboard"} />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          Need an account?{" "}
          <Link className="font-medium text-teal-700 hover:underline" href="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
