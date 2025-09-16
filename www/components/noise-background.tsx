"use client"

import { useTheme } from 'next-themes';
import GrainImage from "@/public/grain.png";
import { usePathname } from 'next/navigation';

const NoiseBackground = () => {
    const { theme } = useTheme();
    const pathname = usePathname();

    if (pathname.startsWith('/scene/')) {
        return null;
    }

    if (theme === "dark") {
        return (
            <div
                className="absolute inset-0 w-full h-full opacity-50 pointer-events-none z-[2]"
                style={{
                    backgroundImage: `url(${GrainImage.src})`,
                    backgroundRepeat: "repeat",
                }}
            />
        );
    }

    return null;
}

export default NoiseBackground
