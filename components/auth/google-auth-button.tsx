"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type GoogleAuthButtonProps = {
  callbackUrl: string;
  disabled?: boolean;
  label: string;
};

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 10.023H12.25v3.955h5.477c-.236 1.272-.962 2.35-2.007 3.071v2.549h3.246c1.9-1.75 2.989-4.328 2.839-7.321-.003-.75-.078-1.492-.225-2.254Z"
        fill="#4285F4"
      />
      <path
        d="M12.25 22c2.7 0 4.966-.894 6.621-2.422l-3.246-2.549c-.905.607-2.061.965-3.375.965-2.596 0-4.796-1.75-5.583-4.105H3.32v2.63A9.996 9.996 0 0 0 12.25 22Z"
        fill="#34A853"
      />
      <path
        d="M6.667 13.889a5.96 5.96 0 0 1 0-3.778V7.48H3.32a10.023 10.023 0 0 0 0 9.038l3.347-2.629Z"
        fill="#FBBC04"
      />
      <path
        d="M12.25 6.005c1.467-.022 2.882.53 3.953 1.544l2.949-2.95A9.947 9.947 0 0 0 12.25 2 9.996 9.996 0 0 0 3.32 7.48l3.347 2.631c.784-2.36 2.986-4.106 5.583-4.106Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  callbackUrl,
  disabled = false,
  label,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    await signIn("google", {
      callbackUrl,
    });
    setIsLoading(false);
  }

  return (
    <button
      className="flex w-full items-center justify-center gap-3 rounded-[1.05rem] border border-[#dce6f4] bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-[#182433] transition hover:border-[#9cb8df] hover:bg-white disabled:cursor-not-allowed disabled:opacity-65"
      disabled={disabled || isLoading}
      onClick={handleClick}
      type="button"
    >
      <GoogleMark />
      <span>
        {disabled
          ? "Google sign-in needs setup"
          : isLoading
            ? "Opening Google..."
            : label}
      </span>
    </button>
  );
}
