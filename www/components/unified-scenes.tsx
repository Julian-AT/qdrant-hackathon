"use client"
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { PlusSignIcon, ArrowLeft01Icon, ArrowRight01Icon, Search01Icon, FilterIcon } from 'hugeicons-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Scene } from '@/lib/db/schema'
import { Skeleton } from './ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'

interface UnifiedScenesProps {
    isMinified?: boolean
}

const SceneSkeleton = memo(() => (
    <div className="flex flex-col space-y-3">
        <Skeleton className="w-full aspect-video rounded-xl bg-secondary" />
        <div className="space-y-2 relative w-full">
            <Skeleton className="h-6 w-1/2 max-w-1/2 bg-secondary" />
            <Skeleton className="h-4 w-1/3 bg-secondary" />
        </div>
    </div>
))

const UnifiedScenesSkeleton = memo(({ isMinified }: { isMinified: boolean }) => (
    <div className={cn('container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10', isMinified && 'rounded-none rounded-b-xl')}>
        <div className='flex justify-between items-center mb-3'>
            <div className='flex flex-col gap-2 w-full'>
                <Skeleton className='bg-secondary w-1/4 h-12' />
                <Skeleton className='bg-secondary w-1/3 h-6' />
            </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3 my-3'>
            {Array.from({ length: 6 }).map((_, i) => (
                <SceneSkeleton key={i} />
            ))}
        </div>
    </div>
))

const FastImagePreview = memo(({
    image,
    alt,
    className
}: {
    image: string;
    alt: string;
    className: string
}) => {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            <Image
                src={image}
                alt={alt}
                className="w-full h-full object-cover"
                loading="lazy"
                fill
            />
        </div>
    );
});

interface SceneCardProps {
    scene: Scene & { latestMessagePart: any[] | null }
    image: string
    createdAt: string
    isPersonal?: boolean
}

const SceneCard = memo(({ scene, image, createdAt, isPersonal = false }: SceneCardProps) => (
    <Link
        href={`/scene/${scene.id}`}
        className='group bg-card rounded-lg overflow-hidden group transition-colors duration-200'
    >
        <div className="relative aspect-video transition-transform duration-200">
            <FastImagePreview
                image={image}
                alt={scene.title}
                className="w-full h-full rounded-lg"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-white font-medium text-lg px-4 py-2 rounded-lg">
                    Preview Scene
                </span>
            </div>
            {/* {isPersonal && (
                <div className="absolute top-2 left-2 bg-card text-primary text-xs px-2 py-1 rounded-md">
                    Your Scene
                </div>
            )} */}
        </div>
        <div className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {scene.title}
            </h3>
            <p className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </p>
        </div>
    </Link>
))

const UnifiedScenes = ({ isMinified = false }: UnifiedScenesProps) => {
    const [isMounted, setIsMounted] = useState(false)
    const [personalScenes, setPersonalScenes] = useState<(Scene & { latestMessagePart: any[] | null })[]>([])
    const [communityScenes, setCommunityScenes] = useState<(Scene & { latestMessagePart: any[] | null })[]>([])
    const [isLoadingPersonal, setIsLoadingPersonal] = useState(false)
    const [isLoadingCommunity, setIsLoadingCommunity] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
    const [currentPage, setCurrentPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [communityCache, setCommunityCache] = useState<Map<number, (Scene & { latestMessagePart: any[] | null })[]>>(new Map())

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const loadPersonalScenes = useCallback(async () => {
        setIsLoadingPersonal(true)
        setError(null)

        try {
            const response = await fetch(`/api/history`)
            if (!response.ok) {
                throw new Error('Failed to load personal scenes')
            }

            const data = await response.json()
            setPersonalScenes(data.scenes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoadingPersonal(false)
        }
    }, [])

    const loadCommunityScenes = useCallback(async (page: number) => {
        if (communityCache.has(page)) {
            const cachedScenes = communityCache.get(page)!
            if (page === 0) {
                setCommunityScenes(cachedScenes)
            } else {
                setCommunityScenes(prev => [...prev, ...cachedScenes])
            }
            setHasMore(cachedScenes.length === 12)
            return
        }

        setIsLoadingCommunity(true)
        setError(null)

        try {
            const response = await fetch(`/api/public-scenes?page=${page}`)
            if (!response.ok) {
                throw new Error('Failed to load community scenes')
            }

            const data = await response.json()
            const newScenes = (data.publicScenes || []) as (Scene & { latestMessagePart: any[] | null })[]

            setCommunityCache(prev => new Map(prev).set(page, newScenes))

            if (page === 0) {
                setCommunityScenes(newScenes)
            } else {
                setCommunityScenes(prev => [...prev, ...newScenes])
            }

            setHasMore(newScenes.length === 12)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoadingCommunity(false)
        }
    }, [communityCache])

    useEffect(() => {
        if (isMounted) {
            loadPersonalScenes()
            loadCommunityScenes(0)
        }
    }, [isMounted, loadPersonalScenes, loadCommunityScenes])

    const validPersonalScenes = useMemo(() => {
        return personalScenes
            .filter(scene =>
                scene.latestMessagePart &&
                scene.latestMessagePart.length > 0 &&
                scene.latestMessagePart[0].data?.scene?.image &&
                scene.latestMessagePart[0].data?.scene?.createdAt
            )
            .map(scene => ({
                ...scene,
                base64Image: scene.latestMessagePart![0].data.scene.image,
                createdAt: scene.latestMessagePart![0].data.scene.createdAt
            }))
    }, [personalScenes])

    const validCommunityScenes = useMemo(() => {
        console.log(communityScenes);

        return communityScenes
            .filter(scene =>
                scene.latestMessagePart &&
                scene.latestMessagePart.length > 0 &&
                scene.latestMessagePart[0].data.scene.image &&
                scene.latestMessagePart[0].data.scene.createdAt
            )
            .map(scene => ({
                ...scene,
                base64Image: scene.latestMessagePart![0].data.scene.image,
                createdAt: scene.latestMessagePart![0].data.scene.createdAt
            }))
    }, [communityScenes])

    const filteredAndSortedCommunityScenes = useMemo(() => {
        let filtered = validCommunityScenes


        if (searchQuery) {
            filtered = filtered.filter(scene =>
                scene.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                case 'title':
                    return a.title.localeCompare(b.title)
                default:
                    return 0
            }
        })
    }, [validCommunityScenes, searchQuery, sortBy])

    const loadMore = useCallback(() => {
        if (!isLoadingCommunity && hasMore) {
            setCurrentPage(prev => prev + 1)
        }
    }, [isLoadingCommunity, hasMore])

    const goToFirstPage = useCallback(() => {
        setCurrentPage(0)
        setCommunityScenes([])
        if (communityCache.has(0)) {
            setCommunityScenes(communityCache.get(0)!)
        }
    }, [communityCache])

    const goToPreviousPage = useCallback(() => {
        setCurrentPage(prev => {
            const newPage = Math.max(0, prev - 1)
            setCommunityScenes([])

            const allScenes: (Scene & { latestMessagePart: any[] | null })[] = []
            for (let i = 0; i <= newPage; i++) {
                if (communityCache.has(i)) {
                    allScenes.push(...communityCache.get(i)!)
                }
            }
            setCommunityScenes(allScenes)

            return newPage
        })
    }, [communityCache])

    const refresh = useCallback(() => {
        setCurrentPage(0)
        setCommunityScenes([])
        setError(null)
        setCommunityCache(new Map())
        loadPersonalScenes()
        loadCommunityScenes(0)
    }, [loadPersonalScenes, loadCommunityScenes])

    if (!isMounted) {
        return <UnifiedScenesSkeleton isMinified={isMinified} />
    }

    if (error || (isLoadingPersonal && isLoadingCommunity && validPersonalScenes.length === 0 && validCommunityScenes.length === 0)) {
        return <UnifiedScenesSkeleton isMinified={isMinified} />
    }

    const hasPersonalScenes = validPersonalScenes.length > 0
    const hasCommunityScenes = filteredAndSortedCommunityScenes.length > 0
    const showPersonalSection = hasPersonalScenes && !isMinified

    if (!hasPersonalScenes && !hasCommunityScenes && !isLoadingPersonal && !isLoadingCommunity) {
        return (
            <div className={cn('container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10', isMinified && 'rounded-none rounded-b-xl')}>
                <div className='flex justify-between items-center mb-3'>
                    <div className='flex flex-col gap-2'>
                        <h2 className='text-3xl font-semibold'>Recent Scenes</h2>
                        <span className='text-sm text-muted-foreground'>
                            Your personal scenes and community creations
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <PlusSignIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No scenes yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first scene or explore the community!</p>
                    <Button asChild variant="outline">
                        <Link href="/">Create Scene</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('container mx-auto overflow-hidden rounded-xl bg-card px-5 py-3 z-10', isMinified && 'rounded-none rounded-b-xl')}>
            {showPersonalSection && (
                <>
                    <div className='flex justify-between items-center mb-3'>
                        <div className='flex flex-col'>
                            <h2 className='text-3xl font-semibold'>
                                Recent Scenes
                            </h2>
                            <span className='text-sm text-muted-foreground'>
                                Your personal scenes and community creations
                            </span>
                        </div>
                        {isMinified && (
                            <Button variant='outline' className='cursor-pointer' asChild>
                                <Link href='/community'>View All</Link>
                            </Button>
                        )}
                    </div>

                    <div className="mb-6">
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                            {validPersonalScenes.slice(0, isMinified ? 3 : 6).map((scene) => (
                                <SceneCard
                                    key={scene.id}
                                    scene={scene}
                                    image={scene.base64Image}
                                    createdAt={scene.createdAt}
                                    isPersonal={true}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}



            <div className="mb-6">
                <div className='flex flex-col mb-3'>
                    <h2 className='text-3xl font-semibold'>
                        Community Scenes
                    </h2>
                    <span className='text-sm text-muted-foreground'>
                        Explore scenes created by the community
                    </span>
                </div>
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative">
                            <Search01Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search community scenes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 max-w-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(value: 'newest' | 'oldest' | 'title') => setSortBy(value)}>
                                <SelectTrigger className="w-[140px]">
                                    <FilterIcon className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="title">Title A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                    {filteredAndSortedCommunityScenes.slice(0, isMinified ? 6 : undefined).map((scene) => (
                        <SceneCard
                            key={scene.id}
                            scene={scene}
                            image={scene.base64Image}
                            createdAt={scene.createdAt}
                        />
                    ))}
                </div>
            </div>

            {!isMinified && (
                <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {filteredAndSortedCommunityScenes.length} community scenes
                        {showPersonalSection && ` • ${validPersonalScenes.length} recent scenes`}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToFirstPage}
                            disabled={currentPage === 0 || isLoadingCommunity}
                        >
                            <ArrowLeft01Icon className="h-4 w-4" />
                            First
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0 || isLoadingCommunity}
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
                            disabled={!hasMore || isLoadingCommunity}
                        >
                            Next
                            <ArrowRight01Icon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {(isLoadingPersonal || isLoadingCommunity) && (
                <div className="flex justify-center py-4">
                    <div className="flex gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                </div>
            )}
        </div>
    )
}

const UnifiedScenesComponent = UnifiedScenes

export default dynamic(() => Promise.resolve(UnifiedScenesComponent), {
    ssr: false,
    loading: () => <UnifiedScenesSkeleton isMinified={false} />
})
