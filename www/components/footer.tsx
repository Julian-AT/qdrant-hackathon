"use client";

import { GithubIcon, Linkedin01Icon, Linkedin02Icon } from "hugeicons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface FooterProps {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  sections?: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
}

const defaultSections = [
  {
    title: "Resources",
    links: [
      { name: "Home", href: "/" },
      { name: "Community", href: "/community" },
      { name: "GitHub", href: "https://github.com/julian-at" },
    ],
  },
];

const defaultSocialLinks = [
  {
    icon: <GithubIcon className="size-5" />,
    href: "https://github.com/julian-at",
    label: "GitHub",
  },
  {
    icon: <Linkedin02Icon className="size-5" />,
    href: "https://www.linkedin.com/in/julian-at/",
    label: "LinkedIn",
  },
];

export const Footer = ({
  logo = {
    url: "/",
    src: "/logo.svg",
    alt: "logo",
    title: "Interiorly",
  },
  sections = defaultSections,
  description = "Generate your dream Home. Powered by Qdrant",
  socialLinks = defaultSocialLinks,
  copyright = "Julian S. All rights reserved.",
  legalLinks = [],
}: FooterProps) => {
  const pathname = usePathname();

  if (pathname.startsWith("/scene/")) {
    return null;
  }

  return (
    <section className="py-16 z-10">
      <div className="container mx-auto bg-card rounded-xl p-8 z-10">
        <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full flex-col justify-between gap-6 lg:items-start">
            {/* Logo */}
            <div className="flex items-center gap-2 lg:justify-start">
              <Image src={logo.src} alt={logo.alt} width={32} height={32} />
              <h2 className="text-xl font-semibold">{logo.title}</h2>
            </div>
            <p className="max-w-[70%] text-sm text-muted-foreground">
              {description}
              <br />
              <br />
              This project is open-source and not commercial. <br />
              Specifically crafted for &quot;Think outside the bot&quot;
              hackathon.
            </p>
            <ul className="flex items-center space-x-6 text-muted-foreground">
              {socialLinks.map((social, idx) => (
                <li key={idx} className="font-medium hover:text-primary">
                  <a href={social.href} aria-label={social.label}>
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 w-full gap-6 lg:gap-20">
            <div />
            <div />
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 font-bold">{section.title}</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <Link
                        href={link.href}
                        className="font-medium hover:text-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-4 border-t py-8 text-xs font-medium text-muted-foreground md:flex-row md:items-center md:text-left">
          <p>{copyright}</p>
          <p className="flex items-center gap-1">
            Engineered with ❤️ in Austria{" "}
            <img
              src="/austria.png"
              alt="Austria"
              width={16}
              height={16}
              className="mt-0.5"
            />
          </p>
        </div>
      </div>
    </section>
  );
};
