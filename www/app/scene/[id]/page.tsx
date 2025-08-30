import { Chat } from '@/components/chat'
import PanoramaViewer from '@/components/scene'
import React from 'react'

const Page = () => {
    return (
        <div className='w-dvw h-dvh bg-background'>
            <PanoramaViewer imageSource='/panorama.png' />
            <div className='absolute bottom-0 left-0 right-0'>
                <Chat />
            </div>
        </div>
    )
}

export default Page
