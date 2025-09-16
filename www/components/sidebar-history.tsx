'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    useSidebar,
} from '@/components/ui/sidebar';
import type { Scene } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { SceneItem } from '@/components/sidebar-history-item';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon } from 'lucide-react';

type GroupedScene = {
    today: Scene[];
    yesterday: Scene[];
    lastWeek: Scene[];
    lastMonth: Scene[];
    older: Scene[];
};

export interface SceneHistory {
    scenes: Array<Scene>;
    hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupScenesByDate = (scenes: Scene[]): GroupedScene => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    return scenes.reduce(
        (groups, scene) => {
            const sceneDate = new Date(scene.createdAt);

            if (isToday(sceneDate)) {
                groups.today.push(scene);
            } else if (isYesterday(sceneDate)) {
                groups.yesterday.push(scene);
            } else if (sceneDate > oneWeekAgo) {
                groups.lastWeek.push(scene);
            } else if (sceneDate > oneMonthAgo) {
                groups.lastMonth.push(scene);
            } else {
                groups.older.push(scene);
            }

            return groups;
        },
        {
            today: [],
            yesterday: [],
            lastWeek: [],
            lastMonth: [],
            older: [],
        } as GroupedScene,
    );
};

export function getSceneHistoryPaginationKey(
    pageIndex: number,
    previousPageData: SceneHistory,
) {
    if (previousPageData && previousPageData.hasMore === false) {
        return null;
    }

    if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

    const firstSceneFromPage = previousPageData.scenes.at(-1);

    if (!firstSceneFromPage) return null;

    return `/api/history?ending_before=${firstSceneFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
    const { setOpenMobile } = useSidebar();
    const { id } = useParams();

    const {
        data: paginatedSceneHistories,
        setSize,
        isValidating,
        isLoading,
        mutate,
    } = useSWRInfinite<SceneHistory>(getSceneHistoryPaginationKey, fetcher, {
        fallbackData: [],
    });

    const router = useRouter();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const hasReachedEnd = paginatedSceneHistories
        ? paginatedSceneHistories.some((page) => page.hasMore === false)
        : false;

    const hasEmptySceneHistory = paginatedSceneHistories
        ? paginatedSceneHistories.every((page) => page.scenes.length === 0)
        : false;

    const handleDelete = async () => {
        const deletePromise = fetch(`/api/scene?id=${deleteId}`, {
            method: 'DELETE',
        });

        toast.promise(deletePromise, {
            loading: 'Deleting scene...',
            success: () => {
                mutate((sceneHistories) => {
                    if (sceneHistories) {
                        return sceneHistories.map((sceneHistory) => ({
                            ...sceneHistory,
                            scenes: sceneHistory.scenes.filter((scene) => scene.id !== deleteId),
                        }));
                    }
                });

                return 'Chat deleted successfully';
            },
            error: 'Failed to delete chat',
        });

        setShowDeleteDialog(false);

        if (deleteId === id) {
            router.push('/');
        }
    };

    if (!user) {
        return (
            <SidebarGroup>
                <SidebarGroupContent>
                    <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
                        Login to save and revisit previous chats!
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    if (isLoading) {
        return (
            <SidebarGroup>
                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                    Today
                </div>
                <SidebarGroupContent>
                    <div className="flex flex-col">
                        {[44, 32, 28, 64, 52].map((item) => (
                            <div
                                key={item}
                                className="rounded-md h-8 flex gap-2 px-2 items-center"
                            >
                                <div
                                    className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                                    style={
                                        {
                                            '--skeleton-width': `${item}%`,
                                        } as React.CSSProperties
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    if (hasEmptySceneHistory) {
        return (
            <SidebarGroup>
                <SidebarGroupContent>
                    <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
                        Your conversations will appear here once you start chatting!
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    return (
        <>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {paginatedSceneHistories &&
                            (() => {
                                const scenesFromHistory = paginatedSceneHistories.flatMap(
                                    (paginatedSceneHistory) => paginatedSceneHistory.scenes,
                                );

                                const groupedScenes = groupScenesByDate(scenesFromHistory);

                                return (
                                    <div className="flex flex-col gap-6">
                                        {groupedScenes.today.length > 0 && (
                                            <div>
                                                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                                                    Today
                                                </div>
                                                {groupedScenes.today.map((scene) => (
                                                    <SceneItem
                                                        key={scene.id}
                                                        scene={scene}
                                                        isActive={scene.id === id}
                                                        onDelete={(sceneId) => {
                                                            setDeleteId(sceneId);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        setOpenMobile={setOpenMobile}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {groupedScenes.yesterday.length > 0 && (
                                            <div>
                                                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                                                    Yesterday
                                                </div>
                                                {groupedScenes.yesterday.map((scene) => (
                                                    <SceneItem
                                                        key={scene.id}
                                                        scene={scene}
                                                        isActive={scene.id === id}
                                                        onDelete={(sceneId) => {
                                                            setDeleteId(sceneId);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        setOpenMobile={setOpenMobile}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {groupedScenes.lastWeek.length > 0 && (
                                            <div>
                                                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                                                    Last 7 days
                                                </div>
                                                {groupedScenes.lastWeek.map((scene) => (
                                                    <SceneItem
                                                        key={scene.id}
                                                        scene={scene}
                                                        isActive={scene.id === id}
                                                        onDelete={(sceneId) => {
                                                            setDeleteId(sceneId);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        setOpenMobile={setOpenMobile}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {groupedScenes.lastMonth.length > 0 && (
                                            <div>
                                                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                                                    Last 30 days
                                                </div>
                                                {groupedScenes.lastMonth.map((scene) => (
                                                    <SceneItem
                                                        key={scene.id}
                                                        scene={scene}
                                                        isActive={scene.id === id}
                                                        onDelete={(sceneId) => {
                                                            setDeleteId(sceneId);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        setOpenMobile={setOpenMobile}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {groupedScenes.older.length > 0 && (
                                            <div>
                                                <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                                                    Older than last month
                                                </div>
                                                {groupedScenes.older.map((scene) => (
                                                    <SceneItem
                                                        key={scene.id}
                                                        scene={scene}
                                                        isActive={scene.id === id}
                                                        onDelete={(sceneId) => {
                                                            setDeleteId(sceneId);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        setOpenMobile={setOpenMobile}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                    </SidebarMenu>

                    <motion.div
                        onViewportEnter={() => {
                            if (!isValidating && !hasReachedEnd) {
                                setSize((size) => size + 1);
                            }
                        }}
                    />

                    {hasReachedEnd ? (
                        <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
                            You have reached the end of your chat history.
                        </div>
                    ) : (
                        <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
                            <div className="animate-spin">
                                <LoaderIcon />
                            </div>
                            <div>Loading Chats...</div>
                        </div>
                    )}
                </SidebarGroupContent>
            </SidebarGroup>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            chat and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}