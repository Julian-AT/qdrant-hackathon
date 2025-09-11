'use client';

import { useEffect, useRef } from 'react';
import { useDataStream } from '@/components/data-stream-provider';
import { useScene } from '@/hooks/use-scene';

export function DataStreamHandler() {
    const { dataStream } = useDataStream();
    const { updateProgress, setSceneResult, setError } = useScene();

    const lastProcessedIndex = useRef(-1);

    useEffect(() => {
        if (!dataStream?.length) return;

        const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
        lastProcessedIndex.current = dataStream.length - 1;

        newDeltas.forEach((delta) => {
            console.log('Data stream delta:', delta);

            try {
                switch (delta.type) {
                    case "data-sceneProgress":
                        const { progress, message, ui } = delta.data;
                        console.log("delta ui", ui);

                        updateProgress(progress, message, ui);
                        break;

                    case "data-sceneResult":
                        const { id, title, prompt, image, isComplete } = delta.data;
                        if (isComplete && image) {
                            setSceneResult(image, prompt, title);
                        }
                        break;

                    case "data-sceneError":
                        const { message: errorMessage, code } = delta.data;
                        console.error('Scene generation error:', { message: errorMessage, code });
                        setError(errorMessage || 'An unknown error occurred');
                        break;

                    default:
                        console.log('Unhandled delta type:', delta.type);
                }
            } catch (error) {
                console.error('Error processing delta:', error);
                setError(`Failed to process update: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }, [dataStream, updateProgress, setSceneResult, setError]);

    return null;
}