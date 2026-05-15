"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface InsufficientCreditsOverlayProps {
  remainingCredits: number;
  requiredCredits: number;
  hasSubscription: boolean;
}

export function InsufficientCreditsOverlay({
  hasSubscription,
}: InsufficientCreditsOverlayProps) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        {/* <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div> */}

        <p className="text-sm text-muted-foreground">
          {hasSubscription ? "Not enough credits" : "Not enough credits"}
        </p>

        <Button onClick={() => router.push("/pricing")} size="sm">
          Upgrade now
        </Button>
      </div>
    </div>
  );
}
