import Link from "next/link";

import { AuthForm } from "@/features/auth/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#ccfbf1,_#f8fafc_45%)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
        <p className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-teal-800">
          ClientFlow
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Start with an organization workspace after signup.
        </p>
        <div className="mt-6">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-medium text-teal-700 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
