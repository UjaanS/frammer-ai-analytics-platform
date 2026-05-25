"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function Error({ reset }: { reset: () => void }) {
  return <ErrorState reset={reset} />;
}
