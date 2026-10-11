"use client";

import { useActionState } from "react";

import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/features/auth/actions/auth";
import { FormSubmitButton } from "@/components/form-submit-button";

const initialState: AuthActionState = {};

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const buttonClass =
  "inline-flex w-full items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/dashboard" }: AuthFormProps) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" ? (
        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            className={fieldClass}
            name="fullName"
            type="text"
            autoComplete="name"
            required
          />
        </label>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className={fieldClass}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          className={fieldClass}
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </label>

      {mode === "login" ? (
        <input type="hidden" name="next" value={nextPath} />
      ) : null}

      {state.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      <FormSubmitButton
        className={buttonClass}
        pendingLabel={mode === "login" ? "Signing in…" : "Creating account…"}
      >
        {mode === "login" ? "Sign in" : "Create account"}
      </FormSubmitButton>
    </form>
  );
}
