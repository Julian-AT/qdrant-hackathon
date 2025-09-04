'use client';

import { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { updateSceneVisibility } from '@/app/(scene)/actions';
import type { VisibilityType } from '@/components/visibility-selector';
import { getSceneHistoryPaginationKey } from '@/components/sidebar-history';

export function useSceneVisibility({
    sceneId,
    initialVisibilityType,
}: {
    sceneId: string;
    initialVisibilityType: VisibilityType;
}) {
    const { mutate, cache } = useSWRConfig();
    // const history: SceneHistory = cache.get('/api/scene')?.data;

    const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
        `${sceneId}-visibility`,
        null,
        {
            fallbackData: initialVisibilityType,
        },
    );

    // const visibilityType = useMemo(() => {
    //     if (!history) return localVisibility;
    //     const chat = history.chats.find((chat) => chat.id === chatId);
    //     if (!chat) return 'private';
    //     return chat.visibility;
    // }, [history, chatId, localVisibility]);

    const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
        setLocalVisibility(updatedVisibilityType);
        mutate(unstable_serialize(getSceneHistoryPaginationKey));

        updateSceneVisibility({
            sceneId: sceneId,
            visibility: updatedVisibilityType,
        });
    };

    return { visibilityType: localVisibility, setVisibilityType };
}