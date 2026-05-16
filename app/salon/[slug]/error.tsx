"use client";

import { PageErrorState } from "@/components/ui/page-error-state";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SalonError({ reset }: ErrorProps) {
  return (
    <PageErrorState
      description="The public booking page could not load completely. Retry to fetch the salon details and available slots again."
      reset={reset}
      title="This salon page is temporarily unavailable."
    />
  );
}
