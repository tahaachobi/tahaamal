"use client";

import { PageErrorState } from "@/components/ui/page-error-state";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
  return (
    <PageErrorState
      description="The page hit an unexpected problem. You can retry immediately without losing the rest of the app."
      reset={reset}
      title="We could not load this page."
    />
  );
}
