"use client";

import { PageErrorState } from "@/components/ui/page-error-state";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AccountError({ reset }: ErrorProps) {
  return (
    <PageErrorState
      description="Your booking history could not load right now. Retry to fetch the latest reservations and statuses."
      reset={reset}
      title="We could not load your account history."
    />
  );
}
