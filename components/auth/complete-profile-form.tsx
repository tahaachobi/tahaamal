"use client";

import { signOut, useSession } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { RoleSelector } from "@/components/auth/role-selector";
import { isValidPhone, normalizePhone } from "@/lib/contact";

type CompleteProfileFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultRole: "CLIENT" | "SALON_OWNER";
  email: string;
  nextPath: string;
};

export function CompleteProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultRole,
  email,
  nextPath,
}: CompleteProfileFormProps) {
  const { update } = useSession();
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "SALON_OWNER">(defaultRole);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const phoneValidationMessage =
    phone.trim() && !isValidPhone(normalizedPhone)
      ? "Please enter a valid phone number with country code."
      : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isValidPhone(normalizedPhone)) {
      setError("Please enter a valid phone number with country code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: normalizedPhone,
          password,
          role,
        }),
      });

      const payload = (await response.json()) as {
        destination?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(
          payload.error ?? "We could not finish your account setup right now.",
        );
        return;
      }

      await update();
      window.location.assign(nextPath || payload.destination || "/account");
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <div
          aria-live="polite"
          className="rounded-[1.2rem] border border-[#f0c6cf] bg-[#fff4f6] px-4 py-3 text-sm text-[#b23b56]"
        >
          {error}
        </div>
      ) : null}

      <div className="rounded-[1.2rem] border border-[#dce6f4] bg-[#f7fbff] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7d95]">
          Google account
        </p>
        <p className="mt-2 text-sm font-medium text-[#152235]">{email}</p>
      </div>

      <div className="space-y-4 rounded-[1.35rem] border border-[#dce6f4] bg-[#f8fbff] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#152235]">First name</span>
            <input
              autoComplete="given-name"
              className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Sara"
              required
              type="text"
              value={firstName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#152235]">Last name</span>
            <input
              autoComplete="family-name"
              className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Bennani"
              required
              type="text"
              value={lastName}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">Phone number</span>
          <input
            autoComplete="tel"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+212612345678"
            required
            type="tel"
            value={phone}
          />
        </label>

        {phoneValidationMessage ? (
          <p className="text-xs leading-5 text-[#b23b56]">{phoneValidationMessage}</p>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#152235]">
            Password for email sign-in
          </span>
          <input
            autoComplete="new-password"
            className="w-full rounded-[1rem] border border-[#dce6f4] bg-white px-4 py-3 text-sm text-[#152235] outline-none transition focus:border-[#1b4d6d] focus:ring-4 focus:ring-[#d7e8f5]"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Optional, but useful if you want regular sign-in too"
            type="password"
            value={password}
          />
          <p className="text-xs leading-5 text-[#607086]">
            Leave this empty if you only want to continue with Google.
          </p>
        </label>
      </div>

      <RoleSelector onChange={setRole} value={role} />

      <button
        className="w-full rounded-[1rem] bg-[#183445] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(24,52,69,0.22)] transition hover:bg-[#0f2634] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving your profile..." : "Finish account setup"}
      </button>

      <button
        type="button"
        className="w-full mt-2 text-sm text-[#607086] hover:text-[#152235] transition underline"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Log out
      </button>
    </form>
  );
}
