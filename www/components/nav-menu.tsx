"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type React from "react";
import { useRef, useState } from "react";

interface NavItem {
  name: string;
  href: string;
}

const navs: NavItem[] = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "Community",
    href: "/community",
  },
  {
    name: "GitHub",
    href: "https://github.com/julian-at/qdrant-hackathon",
  },
];

export function NavMenu() {
  const ref = useRef<HTMLUListElement>(null);
  const [left, _setLeft] = useState(0);
  const [width, _setWidth] = useState(0);
  const [isReady, _setIsReady] = useState(false);
  const pathname = usePathname();

  return (
    <div className="w-full hidden md:block">
      <ul
        className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center"
        ref={ref}
      >
        {navs.map((item) => {
          const isExternal = item.href.startsWith('http');
          const isActive = pathname === item.href;

          return (
            <li
              key={item.name}
              className={`z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2 text-base transition-colors duration-200 ${isActive
                ? "text-primary"
                : "text-primary/60 hover:text-primary"
                } tracking-tight`}
            >
              {isExternal ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.name}
                </a>
              ) : (
                <Link href={item.href}>
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
        {isReady && (
          <motion.li
            animate={{ left, width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0 my-1.5 rounded-full bg-accent/60 border border-border"
          />
        )}
      </ul>
    </div>
  );
}
