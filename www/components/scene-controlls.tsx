'use client'

import { ArrowDown01Icon, Share08Icon } from 'hugeicons-react'
import Link from 'next/link'
import { Button } from './ui/button'
import FurnitureSheet from './furniture-sheet'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { useMemo, useState } from 'react'
import type { IkeaProduct } from '@/lib/scene'
import { ChatMessage } from '@/lib/types'
import { FastImagePreview } from './personal-scenes'
import { VisibilitySelector } from './visibility-selector'
import { useScene } from '@/hooks/use-scene'
import { useSceneVisibility } from '@/hooks/use-chat-visibility'
import { Session } from 'next-auth'
import { Separator } from './ui/separator'

interface SceneControllsProps {
  ikeaFurniture: IkeaProduct[]
  messages: ChatMessage[]
  session: Session
}

const SceneControlls = ({ ikeaFurniture, messages, session }: SceneControllsProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { scene } = useScene()
  const { visibilityType } = useSceneVisibility({
    sceneId: scene.id,
    initialVisibilityType: 'public',
  })


  const sceneHistroy = useMemo(() => {
    return messages.flatMap(message =>
      message.parts
        .filter(part => part.type === 'data-sceneResult')
    )
  }, [messages])

  return (
    <div className='absolute h-dvh w-dvw overflow-hidden'>
      <motion.div
        className='absolute z-10 backdrop-blur-xl bg-card/80 border border-white/[0.08] shadow-lg flex flex-col w-full transition-all duration-300 ease-out'
        initial={{ y: 0 }}
        animate={{ y: 0 }}
      >
        <motion.div
          className='flex items-center justify-between px-4 py-3'
          animate={{
            paddingTop: isExpanded ? '0.75rem' : '0.75rem',
            paddingBottom: isExpanded ? '0.75rem' : '0.75rem'
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className='relative flex gap-3 items-center'>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Interiorly" width={28} height={28} />
              <p className="text-lg font-semibold text-primary">Interiorly</p>
            </Link>
            <Separator orientation='vertical' className='' />
            <VisibilitySelector sceneId={scene.id} selectedVisibilityType={visibilityType} />

          </div>

          <div className='flex items-center gap-3'>
            <motion.div
              className='flex items-center gap-2'
              animate={{
                scale: isExpanded ? 1 : 0.9,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <FurnitureSheet ikeaFurniture={ikeaFurniture} />
            </motion.div>

            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='h-8 w-8 p-0 hover:bg-white/10 transition-colors'
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <ArrowDown01Icon className='size-4' />
              </motion.div>
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className='overflow-hidden border-t border-white/[0.05]'
            >
              <div className='px-4 py-4'>
                <div>
                  <h3 className='text-sm font-medium text-muted-foreground mb-3'>Scene History</h3>
                  <div className='flex gap-3 w-full overflow-x-auto'>
                    {sceneHistroy.map((scene, index) => (
                      <motion.div
                        key={`preview-${index}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.02,
                          ease: 'easeOut'
                        }}
                        whileTap={{ scale: 0.95 }}
                        className='aspect-video group h-32 bg-card/60 border border-white/[0.1] rounded-xl flex items-center justify-center cursor-pointer hover:bg-black/40 transition-all duration-200 relative overflow-hidden group'
                      >
                        <FastImagePreview
                          base64Image={scene.data.scene.image}
                          alt={scene.data.scene.title}
                          className='w-full h-full rounded-xl'
                        />
                        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all duration-200' />
                        <div className='absolute inset-0 flex items-center justify-center z-10'>
                          <span className='text-xs text-white font-medium hidden group-hover:block'>Select Scene</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default SceneControlls