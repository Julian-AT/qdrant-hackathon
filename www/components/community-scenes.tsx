"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import {
  PlusSignIcon,
  RefreshIcon,
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "hugeicons-react";
import { cn, fetcher } from "@/lib/utils";
import Link from "next/link";
import { Scene } from "@/lib/db/schema";
import { SceneResult } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface CommunityScenesProps {
  isMinified?: boolean;
  isHistory?: boolean;
}

const SceneSkeleton = () => (
  <div className="flex flex-col space-y-3">
    <Skeleton className="w-full aspect-video rounded-xl bg-secondary" />
    <div className="space-y-2 relative w-full">
      <Skeleton className="h-6 w-1/2 max-w-1/2 bg-secondary" />
      <Skeleton className="h-4 w-1/3 bg-secondary" />
    </div>
  </div>
);

const CommunityScenesSkeleton = ({ isMinified }: { isMinified: boolean }) => (
  <div
    className={cn(
      "container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10",
      isMinified && "rounded-none rounded-b-xl",
    )}
  >
    <div className="flex justify-between items-center mb-3">
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="bg-secondary w-1/4 h-12" />
        <Skeleton className="bg-secondary w-1/3 h-6" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SceneSkeleton key={i} />
      ))}
    </div>
  </div>
);

const FastImagePreview = ({
  base64Image,
  alt,
  className,
}: {
  base64Image: string;
  alt: string;
  className: string;
}) => {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={base64Image}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

const CommunityScenes = ({ isMinified = false }: CommunityScenesProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [scenes, setScenes] = useState<
    (Scene & { latestMessagePart: any[] | null })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadScenes = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/public-scenes?page=${page}`);
      console.log(response);

      if (!response.ok) {
        throw new Error("Failed to load scenes");
      }

      const data = await response.json();
      const newScenes = (data.publicScenes || []) as (Scene & {
        latestMessagePart: any[] | null;
      })[];

      if (page === 0) {
        setScenes(newScenes);
      } else {
        setScenes((prev) => [...prev, ...newScenes]);
      }

      setHasMore(newScenes.length === 12); // Assuming 12 items per page
    } catch (err) {
      console.log(err);

      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      loadScenes(currentPage);
    }
  }, [isMounted, currentPage]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const refresh = () => {
    setCurrentPage(0);
    setScenes([]);
    setError(null);
    loadScenes(0);
  };

  if (!isMounted) {
    return <CommunityScenesSkeleton isMinified={isMinified} />;
  }

  if (error || (isLoading && scenes.length === 0)) {
    console.log(error);

    return <CommunityScenesSkeleton isMinified={isMinified} />;
  }

  if (scenes.length === 0 && !isLoading) {
    return (
      <div
        className={cn(
          "container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10",
          isMinified && "rounded-none rounded-b-xl",
        )}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-semibold">Community Scenes</h2>
            <span className="text-sm text-muted-foreground">
              Explore scenes created by the community
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <PlusSignIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No public scenes yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share a scene with the community!
          </p>
          <Button asChild variant="outline">
            <Link href="/">Create Scene</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10",
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold">Community Scenes</h2>
          <span className="text-sm text-muted-foreground">
            Explore scenes created by the community
          </span>
        </div>
        {isMinified && (
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link href="/community">View All</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
        {scenes.map((scene) => {
          if (
            !scene.latestMessagePart ||
            scene.latestMessagePart.length === 0
          ) {
            return null;
          }

          const base64Image = scene.latestMessagePart[0].data.image;
          const createdAt = scene.latestMessagePart[0].data.createdAt;

          if (!base64Image || !createdAt) {
            return null;
          }

          return (
            <Link
              href={`/scene/${scene.id}`}
              key={scene.id}
              className="group bg-card rounded-lg overflow-hidden group transition-colors duration-200"
            >
              <div className="relative aspect-video transition-transform duration-200">
                <FastImagePreview
                  base64Image={base64Image}
                  alt={scene.title}
                  className="w-full h-full rounded-lg"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-white font-medium text-lg px-4 py-2 rounded-lg">
                    Preview Scene
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {scene.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Created{" "}
                  {formatDistanceToNow(new Date(createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
          );
        })}

        {isMinified && (
          <Link
            href="/community"
            className={cn(
              "bg-background rounded-lg aspect-video border flex items-center justify-center gap-2 text-muted-foreground hover:border-secondary hover:text-primary transition-colors duration-200 group",
            )}
          >
            <PlusSignIcon className="size-6 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-lg">Explore Scenes</span>
          </Link>
        )}
      </div>

      {!isMinified && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Showing {scenes.length} scenes
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0 || isLoading}
            >
              <ArrowLeft01Icon className="h-4 w-4" />
              First
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || isLoading}
            >
              <ArrowLeft01Icon className="h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage + 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={!hasMore || isLoading}
            >
              Next
              <ArrowRight01Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

const CommunityScenesComponent = CommunityScenes;

export default dynamic(() => Promise.resolve(CommunityScenesComponent), {
  ssr: false,
  loading: () => <CommunityScenesSkeleton isMinified={false} />,
});
