"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { RoleSelector } from "@/components/auth/role-selector";
import { isValidPhone, normalizePhone } from "@/lib/contact";
import { combineProfileName } from "@/lib/profile-fields";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterFormProps = {
  googleAuthEnabled?: boolean;
};

export function RegisterForm({ googleAuthEnabled = false }: RegisterFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "SALON_OWNER">("SALON_OWNER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);

  const emailValidationMessage =
    email.trim() && !isEmailValid ? "Please enter a valid email address." : "";
  const phoneValidationMessage =
    phone.trim() && !isValidPhone(normalizedPhone)
      ? "Please enter a valid phone number with country code."
      : "";
  const passwordValidationMessage =
    password.trim().length > 0 && password.trim().length < 8
      ? "Choose at least 8 characters."
      : "";

  const canSubmit =
    isEmailValid &&
    !isSubmitting &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    isValidPhone(normalizedPhone) &&
    password.trim().length >= 8;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          name: combineProfileName(firstName, lastName),
          phone: normalizedPhone,
          password,
          role,
          verificationMethod: "EMAIL",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(
          payload.error ?? "We could not create your account. Please try again.",
        );
        return;
      }

      const callbackUrl = role === "SALON_OWNER" ? "/dashboard" : "/account";
      router.push(
        `/login?registered=1&identifier=${encodeURIComponent(
          normalizedEmail,
        )}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <GoogleAuthButton
        callbackUrl="/complete-profile"
        disabled={!googleAuthEnabled}
        label="Sign up with Google"
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

        <div className="space-y-5 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#152235]">First name</span>
              <input
                autoComplete="given-name"
                className="w-full rounded-[1rem] border border-[#dce6f4] bg-[#fdfefe] px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Yasmine"
                required
                type="text"
                value={firstName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#152235]">Last name</span>
              <input
                autoComplete="family-name"
                className="w-full rounded-[1rem] border border-[#dce6f4] bg-[#fdfefe] px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
                onChange={(event) => setLastName(event.target.value)}
                placeholder="El Fassi"
                required
                type="text"
                value={lastName}
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#152235]">
              Phone number
            </span>
            <input
              autoComplete="tel"
              className="w-full rounded-[1rem] border border-[#dce6f4] bg-[#fdfefe] px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+212612345678"
              required
              type="tel"
              value={phone}
            />
          </label>

          {phoneValidationMessage ? (
            <p className="text-xs leading-5 text-[#b23b56]">
              {phoneValidationMessage}
            </p>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#152235]">Password</span>
            <input
              autoComplete="new-password"
              className="w-full rounded-[1rem] border border-[#dce6f4] bg-[#fdfefe] px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose at least 8 characters"
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

          <RoleSelector onChange={setRole} value={role} />

          <button
            className="w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(24,52,69,0.22)] transition hover:bg-[#0f2634] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? "Creating your account..." : "Create account"}
          </button>
        </div>
      </div>

      <p className="text-sm text-[#607086]">
        Already have an account?{" "}
        <Link className="font-semibold text-[#1b4d6d]" href="/login">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
