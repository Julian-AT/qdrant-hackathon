"use client";

import {
  AlertCircleIcon,
  GithubIcon,
  Home12Icon,
} from "hugeicons-react";
import { LoaderIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { buttonVariants } from "./ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "./ui/progress";

interface GenerationProgressProps {
  progress: number;
  statusMessage: string | null;
  error: string | null;
  ui: ReactNode | null;
}

export function GenerationProgress({
  progress,
  statusMessage,
  error,
  ui,
}: GenerationProgressProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [baselineEstimate] = useState<number>(120000); // 2 minutes baseline

  useEffect(() => {
    if (progress > 0 && startTime === null) {
      setStartTime(Date.now());
      setEta("~2m");
      return;
    }

    if (startTime && progress > 0 && progress < 100) {
      const elapsedTime = Date.now() - startTime;

      // Use baseline estimate for first 10% of progress
      if (progress < 10) {
        const remainingTime = baselineEstimate - elapsedTime;
        if (remainingTime > 0) {
          const minutes = Math.floor(remainingTime / 60000);
          const seconds = Math.floor((remainingTime % 60000) / 1000);

          if (minutes > 0) {
            setEta(`${minutes}m ${seconds}s`);
          } else {
            setEta(`${seconds}s`);
          }
        }
        return;
      }

      // For progress > 10%, use weighted calculation
      const linearEstimate = (elapsedTime / progress) * 100;
      const remainingTime = Math.min(linearEstimate - elapsedTime, baselineEstimate - elapsedTime);

      // Apply smoothing factor to prevent wild fluctuations
      const smoothedProgress = Math.max(progress, 15);
      const smoothingFactor = Math.min(0.7, smoothedProgress / 100);
      const adjustedRemainingTime = remainingTime * smoothingFactor + (baselineEstimate - elapsedTime) * (1 - smoothingFactor);

      if (adjustedRemainingTime > 0) {
        const minutes = Math.floor(adjustedRemainingTime / 60000);
        const seconds = Math.floor((adjustedRemainingTime % 60000) / 1000);

        if (minutes > 0) {
          setEta(`${minutes}m ${seconds}s`);
        } else {
          setEta(`${seconds}s`);
        }
      }
    } else if (progress >= 100) {
      setEta("Complete");
    }
  }, [progress, startTime, baselineEstimate]);

  if (error) {
    toast.error(error);

    return (
      <div className="flex items-center justify-center h-full z-10">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center">
            <AlertCircleIcon className="size-8 " />
          </div>
          <h3 className="text-lg font-semibold text-secondary-foreground mt-5">
            Oops! Something went wrong
          </h3>
          <p className="text-muted-foreground text-sm mb-5">
            Please try again later or report the issue.
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "mx-1.5")}
          >
            <Home12Icon className="size-4" />
            Back Home
          </Link>
          <Link
            href="https://github.com/julian-at/qdrant-hackathon"
            className={cn(buttonVariants({ variant: "default" }), "mx-1.5")}
          >
            <GithubIcon className="size-4" />
            Report Issue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-dvh absolute w-dvw  overflow-hidden z-10">
      <div className="text-center max-w-md w-full px-6">
        <div className="flex items-center justify-center">
          <LoaderIcon className="size-8 animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-secondary-foreground mt-5">
          {statusMessage || "Generating panorama..."}
        </h3>
        <p className="text-muted-foreground text-sm">
          This may take a few minutes.
        </p>
        {/* {ui && typeof ui === 'object' && 'type' in ui ? (
          React.createElement(ui.type, ui.props)
        ) : (
          ui as ReactNode
        )} */}
        <div className="absolute bottom-5 left-0 right-0 max-w-1/4 mx-auto">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground mt-2">
            ETA: {eta || "Calculating..."}
          </p>
        </div>
      </div>
    </div>
  );
}
