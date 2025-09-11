"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import React, { useRef, useState } from "react";

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
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isManualScroll, setIsManualScroll] = useState(false);
  const pathname = usePathname();

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem,
  ) => {
    e.preventDefault();

    const targetId = item.href.substring(1);
    const element = document.getElementById(targetId);

    if (element) {
      // Set manual scroll flag
      setIsManualScroll(true);

      // Calculate exact scroll position
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px offset

      // Smooth scroll to exact position
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Reset manual scroll flag after animation completes
      setTimeout(() => {
        setIsManualScroll(false);
      }, 500); // Adjust timing to match scroll animation duration
    }
  };

  return (
    <div className="w-full hidden md:block">
      <ul
        className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center"
        ref={ref}
      >
        {navs.map((item) => (
          <li
            key={item.name}
            className={`z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2 text-base transition-colors duration-200 ${pathname === item.href
              ? "text-primary"
              : "text-primary/60 hover:text-primary"
              } tracking-tight`}
          >
            <a href={item.href} onClick={(e) => handleClick(e, item)}>
              {item.name}
            </a>
          </li>
        ))}
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
