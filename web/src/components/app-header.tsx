"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/bounties", label: "Bounties" },
  { href: "/bounties/create", label: "Create" },
  { href: "/submit", label: "Submit" },
  { href: "/reviews", label: "Reviews" },
  { href: "/protocol", label: "Protocol" },
] as const;

function ProofPayMark() {
  return (
    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.7]">
        <circle cx="12" cy="12" r="8.75" strokeDasharray="49 8" transform="rotate(-35 12 12)" />
        <path d="m8.1 12.3 2.5 2.5 5.4-5.7" />
      </svg>
    </span>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMobileNav() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  function isLinkActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/bounties") {
      return (
        pathname === "/bounties" ||
        (pathname.startsWith("/bounties/") &&
          !pathname.startsWith("/bounties/create") &&
          !pathname.endsWith("/submit"))
      );
    }
    if (href === "/bounties/create") {
      return pathname === "/bounties/create";
    }
    if (href === "/submit") {
      return pathname === "/submit" || pathname.endsWith("/submit");
    }
    if (href === "/reviews") {
      return pathname === "/reviews" || pathname.startsWith("/reviews/");
    }
    return pathname === href;
  }

  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid min-h-[68px] grid-cols-2 items-center gap-y-2 py-3 lg:grid-cols-[1fr_auto_1fr]">
          {/* Left: Brand Logo */}
          <div className="flex items-center justify-start">
            <Link className="flex items-center gap-3" href="/" aria-label="ProofPay home">
              <ProofPayMark />
              <span className="text-2xl tracking-[-0.055em]">ProofPay</span>
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <nav aria-label="Primary navigation" className="hidden items-center justify-center gap-5 text-sm lg:flex xl:gap-7">
            {navigationLinks.map(({ href, label }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-1 transition ${
                    active
                      ? "font-medium text-[var(--signal)] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[var(--signal)]"
                      : "text-[var(--muted-ink)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>

        {/* Mobile Navigation */}
        <details ref={detailsRef} className="group border-t border-[var(--line)] lg:hidden">
          <summary className="mobile-nav-summary flex min-h-11 cursor-pointer items-center justify-between py-2">
            <span className="mono text-[10px] tracking-[0.1em] text-[var(--muted-ink)]">NAVIGATION</span>
            <span aria-hidden="true" className="text-lg text-[var(--muted-ink)] transition-transform group-open:rotate-45">+</span>
          </summary>
          <nav aria-label="Mobile primary navigation" className="grid grid-cols-2 gap-x-6 gap-y-1 pb-4 text-sm text-[var(--muted-ink)]">
            {navigationLinks.map(({ href, label }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={closeMobileNav}
                  aria-current={active ? "page" : undefined}
                  className={`border-l py-2 pl-3 transition ${
                    active
                      ? "border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_8%,transparent)] font-medium text-[var(--signal)]"
                      : "border-[var(--line)] hover:border-[var(--signal)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </details>
      </div>
    </header>
  );
}