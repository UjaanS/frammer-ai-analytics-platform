"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  description?: string;
  reset?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The analytics view could not be rendered.",
  reset
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {reset ? (
          <Button className="mt-4" onClick={reset}>
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
