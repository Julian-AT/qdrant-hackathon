"use client"

import { usePathname } from 'next/navigation';
import React from 'react'
import { motion } from 'motion/react';

const GradientBackground = () => {
    const pathname = usePathname();

    if (pathname !== "/") {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-x-hidden max-w-screen h-full">
            <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-[calc(1250px)] border border-blue-500 aspect-square"
            >
                <div className="w-[125rem] h-[125rem] rounded-full bg-gradient-to-t from-pink-500 to-sky-500/90 blur-[100px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                <div className="w-[100rem] h-[100rem] rounded-full bg-gradient-to-t from-purple-600 to-orange-500/90 blur-[70px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                <div className="w-[60rem] h-[60rem] rounded-full bg-gradient-to-t from-purple-700/40 to-pink-700 blur-[50px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                <div className="w-[45rem] h-[45rem] rounded-full bg-gradient-to-t from-purple-800/50 to-orange-800/50 blur-[30px] absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
            </motion.div>
        </div>
    )
}

export default GradientBackground
