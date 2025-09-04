'use client';

import { AlertCircleIcon, GithubIcon, Home12Icon, Sad01Icon } from 'hugeicons-react';
import { LoaderIcon } from 'lucide-react';
import React from 'react';
import { Button, buttonVariants } from './ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GenerationProgressProps {
    progress: number;
    statusMessage: string | null;
    error: string | null;
}

export function GenerationProgress({
    progress,
    statusMessage,
    error
}: GenerationProgressProps) {
    if (error) {
        toast.error(error)

        return (
            <div className="flex items-center justify-center h-full z-10 -mt-8">
                <div className="text-center max-w-md">
                    <div className='flex items-center justify-center'>
                        <AlertCircleIcon className='size-8 ' />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-foreground mt-5">
                        Oops! Something went wrong</h3>
                    <p className='text-muted-foreground text-sm mb-5'>
                        Please try again later or report the issue.
                    </p>
                    <Link href='/' className={cn(buttonVariants({ variant: 'outline' }), "mx-1.5")}>
                        <Home12Icon className='size-4' />
                        Back Home
                    </Link>
                    <Link href='https://github.com/julian-at/qdrant-hackathon' className={cn(buttonVariants({ variant: 'default' }), "mx-1.5")}>
                        <GithubIcon className='size-4' />
                        Report Issue
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full z-10 -mt-8">
            <div className="text-center max-w-md w-full px-6">
                <div className='flex items-center justify-center'>
                    <LoaderIcon className='size-8 animate-spin' />
                </div>

                <h3 className="text-lg font-semibold text-secondary-foreground mt-5">
                    {statusMessage || "Generating panorama..."}
                </h3>
                <p className='text-muted-foreground text-sm'>
                    This may take a few minutes.
                </p>
            </div>
        </div>
    );
}
