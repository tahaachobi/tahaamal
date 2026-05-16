"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Props = {
  email: string;
  token: string;
};

export function ResetPasswordConfirmForm({ email, token }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !email || password.length < 8) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "We could not reset your password.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-[#f0c6cf] bg-[#fff4f6] px-4 py-3 text-sm text-[#b23b56]">
          Invalid reset link. The link might be broken or missing required information.
        </div>
        <Link
          href="/reset-password"
          className="block w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#0f2634]"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.2rem] border border-[#c9ead8] bg-[#effaf4] px-4 py-3 text-sm text-[#246543]">
          Your password has been reset successfully!
        </div>
        <Link
          className="mt-4 block w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#0f2634]"
          href="/login"
        >
          Proceed to Sign In
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
        <div className="rounded-[1rem] bg-[#effaf4] px-4 py-3 text-sm text-[#246543]">
          Resetting password for <strong>{email}</strong>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">New Password</span>
          <input
            autoComplete="new-password"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose at least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        {password.length > 0 && password.length < 8 && (
          <p className="text-xs leading-5 text-[#b23b56]">
            Password must be at least 8 characters.
          </p>
        )}

        <button
          className="w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(24,52,69,0.22)] transition hover:bg-[#0f2634] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={password.length < 8 || isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Save new password"}
        </button>
      </div>
    </form>
  );
}
