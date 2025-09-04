"use client"

import React from 'react'
import { Button } from './ui/button'
import { PlusSignIcon } from 'hugeicons-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CommunityScenes = () => {
    const pathname = usePathname()

    return (
        <div className='container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-20'>
            <div className='flex justify-between items-center'>
                <div className='flex flex-col gap-2'>
                    <h2 className='text-3xl font-semibold'>
                        Community Scenes
                    </h2>
                    <span className='text-sm text-muted-foreground'>
                        Explore scenes created by the community
                    </span>
                </div>
                <Button variant='outline' className='cursor-pointer'>View All</Button>
            </div>
            <div className='grid grid-cols-3 gap-3 my-3'>
                {Array.from({ length: 11 }).map((_, index) => (
                    <div key={index} className='bg-secondary aspect-video rounded-lg' />
                ))}
                {pathname === "/" && (
                    <Link href='/community' className={cn('bg-background rounded-lg border flex items-center justify-center gap-2 text-muted-foreground')}>
                        <PlusSignIcon className='size-6' />
                        <span className='text-lg text-muted-foreground'>
                            Explore Scenes
                        </span>
                    </Link>
                )}
            </div>
        </div>
    )
}

export default CommunityScenes
