"use client";

import { ReactNode, useCallback, useMemo } from "react";
import useSWR from "swr";

export interface SceneData {
    id: string;
    title: string | null;
    image: string | null;
    prompt: string | null;
    isLoading: boolean;
    progress: number;
    statusMessage: string | null;
    error: string | null;
    ui: ReactNode | null;
}

export const initialSceneData: SceneData = {
    id: 'init',
    title: null,
    image: null,
    prompt: null,
    isLoading: true,
    progress: 0,
    statusMessage: null,
    error: null,
    ui: null,
};


export function useScene() {
    const { data: localSceneData, mutate: setLocalSceneData, error } = useSWR(
        "scene-data",
        null,
        {
            fallbackData: initialSceneData,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            initialData: initialSceneData,
        },
    );

    const scene = useMemo(() => {
        if (!localSceneData) return initialSceneData;
        return localSceneData;
    }, [localSceneData]) as SceneData;

    const setScene = useCallback((updaterFn: (sceneData: SceneData) => SceneData | SceneData) => {
        setLocalSceneData((currentSceneData: SceneData) => {
            const updatedSceneData = currentSceneData || initialSceneData;

            if (typeof updaterFn === 'function') {
                return updaterFn(updatedSceneData);
            }

            return updaterFn;
        });
    }, [setLocalSceneData]);

    const updateProgress = useCallback((progress: number, statusMessage: string, ui?: ReactNode) => {
        console.log("updateProgress", progress, statusMessage, ui);

        setScene((currentScene) => ({
            ...currentScene,
            progress,
            statusMessage,
            error: null,
            ui,
        }));
    }, [setScene]);

    const setSceneResult = useCallback((image: string, prompt?: string, title?: string) => {
        setScene((currentScene) => ({
            ...currentScene,
            image,
            prompt: prompt || currentScene.prompt,
            title: title || currentScene.title,
            isLoading: false,
            progress: 100,
            statusMessage: "Complete",
            error: null,
        }));
    }, [setScene]);

    const setError = useCallback((error: string) => {
        setScene((currentScene) => ({
            ...currentScene,
            error,
            isLoading: false,
            progress: 0,
            statusMessage: null,
        }));
    }, [setScene]);

    const resetScene = useCallback(() => {
        setScene(() => initialSceneData);
    }, [setScene]);

    return useMemo(() => ({
        scene,
        setScene,
        updateProgress,
        setSceneResult,
        setError,
        resetScene,
        error,
    }), [scene, setScene, updateProgress, setSceneResult, setError, resetScene, error]);
}

