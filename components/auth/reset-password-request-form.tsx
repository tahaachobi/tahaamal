"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResetPasswordRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmailValid) return;

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "We could not send the reset link. Please try again.");
      } else {
        setSuccessMessage("We've sent a password reset link to your email. Check your inbox!");
        setEmail("");
      }
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.2rem] border border-[#c9ead8] bg-[#effaf4] px-4 py-3 text-sm text-[#246543]">
          {successMessage}
        </div>
        <p className="text-sm text-[#607086]">
        If you didn&apos;t receive it, check your spam folder. You can safely close this window.
        </p>
        <Link
          className="mt-4 block w-full rounded-[1rem] bg-[#f8fbff] border border-[#dce6f4] px-4 py-3 text-center text-sm font-semibold text-[#183445] transition hover:bg-[#dce6f4]"
          href="/login"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div
          aria-live="polite"
          className="rounded-[1.2rem] border border-[#f0c6cf] bg-[#fff4f6] px-4 py-3 text-sm text-[#b23b56]"
        >
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-[1.35rem] border border-[#dce6f4] bg-[#f8fbff] p-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">Your email</span>
          <input
            autoComplete="email"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <button
          className="w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(24,52,69,0.22)] transition hover:bg-[#0f2634] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={!isEmailValid || isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </div>

      <p className="text-center text-sm text-[#607086]">
        Remember your password?{" "}
        <Link className="font-semibold text-[#1b4d6d]" href="/login">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
