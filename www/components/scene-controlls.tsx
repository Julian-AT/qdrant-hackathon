'use client'

import { ArrowDown01Icon, Share08Icon } from 'hugeicons-react'
import Link from 'next/link'
import { Button } from './ui/button'
import FurnitureSheet from './furniture-sheet'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { IkeaProduct } from '@/lib/scene'

interface SceneControllsProps {
  ikeaFurniture: IkeaProduct[]
}

const SceneControlls = ({ ikeaFurniture }: SceneControllsProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className='absolute h-dvh w-dvw overflow-hidden'>
      <motion.div
        className='absolute z-10 backdrop-blur-xl bg-card/80 border border-white/[0.08] shadow-lg flex flex-col w-full transition-all duration-300 ease-out'
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        style={{
          borderRadius: isExpanded ? '0 0 16px 16px' : '0 0 20px 20px'
        }}
      >
        <motion.div
          className='flex items-center justify-between px-4 py-3'
          animate={{
            paddingTop: isExpanded ? '0.75rem' : '0.75rem',
            paddingBottom: isExpanded ? '0.75rem' : '0.75rem'
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className='flex gap-3 items-center'>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Interiorly" width={28} height={28} />
              <p className="text-lg font-semibold text-primary">Interiorly</p>
            </Link>
          </div>

          <div className='flex items-center gap-3'>
            <motion.div
              className='flex items-center gap-2'
              animate={{
                scale: isExpanded ? 1 : 0.9,
                opacity: isExpanded ? 1 : 0.6
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-xs font-medium'
              >
                <Share08Icon className='size-3 mr-1' />
                Share
              </Button>
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
                <div className='mb-4'>
                  <h3 className='text-sm font-medium text-muted-foreground mb-3'>Version History</h3>
                  <div className='flex gap-2 overflow-x-auto pb-2'>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.03,
                          ease: 'easeOut'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant='secondary'
                          className='h-12 w-20 flex-shrink-0'
                        >
                          <div className='flex flex-col items-center gap-1'>
                            <ArrowDown01Icon className='size-3' />
                            <span className='text-xs font-medium'>V{index + 1}</span>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className='text-sm font-medium text-muted-foreground mb-3'>Quick Preview</h3>
                  <div className='grid grid-cols-5 gap-3'>
                    {Array.from({ length: 10 }).map((_, index) => (
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
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className='aspect-video bg-card/60 border border-white/[0.1] rounded-xl flex items-center justify-center cursor-pointer hover:bg-card/80 transition-all duration-200'
                      >
                        <div className='text-center'>
                          <div className='w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mb-1 mx-auto'>
                            <ArrowDown01Icon className='size-3 text-primary' />
                          </div>
                          <span className='text-xs text-muted-foreground font-medium'>V{index + 1}</span>
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