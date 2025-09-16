import { ArrowDown01Icon, } from 'hugeicons-react'
import Link from 'next/link'
import { Button } from './ui/button'
import FurnitureSheet from './furniture-sheet'
import Image from 'next/image'
import type { IkeaProduct } from '@/lib/scene'

interface SceneControllsProps {
    ikeaFurniture: IkeaProduct[]
}

const SceneControlls = ({ ikeaFurniture }: SceneControllsProps) => {
    return (
        <div className='absolute h-dvh w-dvw overflow-hidden'>
            <div className='absolute z-10 backdrop-blur-xl bg-card/75 border border-white/[0.05] shadow-sm flex flex-col gap-2 p-2 w-full'>
                <div className='flex items-center justify-between'>
                    <div className='flex gap-2 items-center'>
                        <Link href="/" className="flex items-center gap-1.5">
                            <Image src="/logo.svg" alt="Interiorly" width={32} height={32} />
                            <p className="text-xl font-semibold text-primary">Interiorly</p>
                        </Link>
                    </div>

                    <div className='flex items-center gap-2'>
                        {/* <Button variant='secondary'>
                            <Share08Icon className='size-4' />
                            Share
                        </Button> */}
                        <FurnitureSheet ikeaFurniture={ikeaFurniture} />
                    </div>
                </div>
            </div>
            <div className='absolute bottom-0 left-0 right-0 border border-green-500 w-full mx-auto z-10'>
                <div className='flex items-center gap-2 max-w-lg mx-auto overflow-scroll'>
                    {Array.from({ length: 10 }).map((_, index) => (
                        <Button variant='secondary' key={index} className='aspect-video h-32'>
                            <ArrowDown01Icon className='size-4' />
                            Version {index + 1}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SceneControlls
