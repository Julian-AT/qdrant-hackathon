"use client"

import { GithubIcon } from "hugeicons-react";
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
    { icon: <GithubIcon className="size-5" />, href: "https://github.com/julian-at", label: "GitHub" },
];


export const Footer = ({
    logo = {
        url: "https://www.julianschmidt.cv/assets/images/profile.jpg",
        src: "https://www.julianschmidt.cv/assets/images/profile.jpg",
        alt: "logo",
        title: "Qdrant Hackathon",
    },
    sections = defaultSections,
    description = "Submission for Qdrant Think outside the bot hackathon. This project is open-source and not commercial.",
    socialLinks = defaultSocialLinks,
    copyright = "Julian S. All rights reserved.",
    legalLinks = [],
}: FooterProps) => {
    const pathname = usePathname();

    if (pathname.startsWith('/scene/')) {
        return null;
    }

    return (
        <section className="py-16 z-10">
            <div className="container mx-auto bg-card rounded-xl p-8 z-10">
                <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">
                    <div className="flex w-full flex-col justify-between gap-6 lg:items-start">
                        {/* Logo */}
                        <div className="flex items-center gap-2 lg:justify-start">
                            <a href={logo.url}>
                                <img
                                    src={logo.src}
                                    alt={logo.alt}
                                    title={logo.title}
                                    className="h-8 rounded-full"
                                />
                            </a>
                            <h2 className="text-xl font-semibold">{logo.title}</h2>
                        </div>
                        <p className="max-w-[70%] text-sm text-muted-foreground">
                            {description}
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
                                        <li
                                            key={linkIdx}
                                            className="font-medium hover:text-primary"
                                        >
                                            <a href={link.href}>{link.name}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-8 flex flex-col justify-between gap-4 border-t py-8 text-xs font-medium text-muted-foreground md:flex-row md:items-center md:text-left">
                    <p className="order-2 lg:order-1">{copyright}</p>
                    <ul className="order-1 flex flex-col gap-2 md:order-2 md:flex-row">
                        {legalLinks.map((link, idx) => (
                            <li key={idx} className="hover:text-primary">
                                <a href={link.href}> {link.name}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
};

