import { PageLoadingShell } from "@/components/ui/page-loading-shell";

export default function AccountLoading() {
  return (
    <PageLoadingShell
      description="We are loading your booking history, prices, and status updates."
      title="Preparing your account..."
    />
  );
}
