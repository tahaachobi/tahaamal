"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

type LoginFormProps = {
  callbackUrl: string;
  defaultEmail?: string;
  googleAuthEnabled?: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  callbackUrl,
  defaultEmail = "",
  googleAuthEnabled = false,
}: LoginFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);

  const emailValidationMessage =
    email.trim() && !isEmailValid ? "Please enter a valid email address." : "";
  const passwordValidationMessage =
    password.trim().length > 0 && password.trim().length < 8
      ? "Password must be at least 8 characters."
      : "";

  const canSubmit = isEmailValid && !isSigningIn && password.trim().length >= 8;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isEmailValid) {
      setError("Please enter a valid email.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSigningIn(true);

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const sessionPayload = (await sessionResponse.json()) as {
        user?: {
          profileCompleted?: boolean;
          role?: string;
        };
      };

      const roleDestination =
        sessionPayload.user?.role === "SALON_OWNER" ? "/dashboard" : "/account";
      const finalDestination = callbackUrl || roleDestination;

      if (!sessionPayload.user?.profileCompleted) {
        window.location.assign(
          `/complete-profile?next=${encodeURIComponent(finalDestination)}`,
        );
        return;
      }

      window.location.assign(finalDestination);
    } catch {
      setError("We could not sign you in right now. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <GoogleAuthButton
        callbackUrl={callbackUrl || "/account"}
        disabled={!googleAuthEnabled}
        label="Continue with Google"
      />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#dce6f4]" />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#7d8ea5]">
          Or continue with email
        </span>
        <span className="h-px flex-1 bg-[#dce6f4]" />
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="rounded-[1.2rem] border border-[#f0c6cf] bg-[#fff4f6] px-4 py-3 text-sm text-[#b23b56]"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-4 rounded-[1.35rem] border border-[#dce6f4] bg-[#f8fbff] p-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">Your email</span>
          <input
            autoComplete="email"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        {emailValidationMessage ? (
          <p className="text-xs leading-5 text-[#b23b56]">{emailValidationMessage}</p>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">Password</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {passwordValidationMessage ? (
          <p className="text-xs leading-5 text-[#b23b56]">
            {passwordValidationMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(24,52,69,0.22)] transition hover:bg-[#0f2634] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={!canSubmit}
          type="submit"
        >
          {isSigningIn ? "Signing in..." : "Sign in"}
        </button>
      </div>

      <div className="space-y-2 text-left text-sm text-[#607086]">
        <p>
          Need a new account?{" "}
          <Link className="font-semibold text-[#1b4d6d]" href="/register">
            Create one here
          </Link>
          .
        </p>
        <p>
          If you do not remember your password,{" "}
          <Link className="font-semibold text-[#1b4d6d]" href="/reset-password">
            reset your password
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
