"use client";


import { cn } from "@/lib/utils";
import Link from "next/link";

export function SceneHeader() {
    return (
        <header className="absolute w-full top-0 h-12 z-50 p-0 bg-black/50 backdrop-blur border-b border-white/[0.05]">
            <div className="flex justify-between items-center p-2 px-4">
                <Link
                    href="/"
                    title="brand-logo"
                    className="relative mr-6 flex items-center space-x-2"
                >
                    LOGO
                </Link>
                <div className="hidden lg:block">
                    <Link
                        href="#"
                        className={cn(
                            "h-8 text-primary-foreground rounded-lg group tracking-tight font-medium"
                        )}
                    >
                        HOME          </Link>
                </div>
            </div>
        </header>
    );
}
