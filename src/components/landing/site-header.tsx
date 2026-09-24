"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Menu,
  Monitor,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/theme-provider";

const themeOptions: {
  value: Theme;
  label: string;
  icon: typeof Sun;
}[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

const navigationItems = [
  { label: "Live Jobs", href: "#live-jobs" },
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  {
    label: "Tools",
    href: "#",
    children: [
      {
        label: "Upwork Rate Calculator",
        href: "/tools/rate-calculator",
      },
      {
        label: "Upwork Fee Calculator",
        href: "/tools/fee-calculator",
      },
      {
        label: "Hourly to Salary Converter",
        href: "/tools/salary-converter",
      },
      {
        label: "Freelance Rate Planner",
        href: "/tools/budget-planner",
      },
      {
        label: "Proposal Character Counter",
        href: "/tools/proposal-counter",
      },
    ],
  },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileItem, setOpenMobileItem] = useState<string | null>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setOpenMobileItem(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
    setOpenMobileItem(null);
  }

  function toggleMobileMenu() {
    setIsMenuOpen((current) => {
      const next = !current;

      if (!next) {
        setOpenMobileItem(null);
      }

      return next;
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#0A0A0A]/10 bg-[#EFF1F3] shadow-[0_8px_25px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#0A0A0A] dark:shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
      <div className="mx-auto grid h-16 w-[calc(100%-2rem)] max-w-[1400px] grid-cols-[1fr_auto] items-center sm:w-[calc(100%-3rem)] lg:h-[72px] lg:w-[calc(100%-7rem)] lg:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link
          href="/"
          aria-label="UpScore home"
          className="flex h-full w-fit min-w-0 items-center rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#00C98B]"
        >
          <Image
            src="/upscore-logo-black.png"
            alt="Logo"
            width={150}
            height={40}
            className="block dark:hidden"
          />

          {/* Dark mode */}
          <Image
            src="/upscore-logo-white.png"
            alt="Logo"
            width={150}
            height={40}
            className="hidden dark:block"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-5 lg:flex xl:gap-7 2xl:gap-9"
        >
          {navigationItems.map((item) => {
            const children = item.children ?? [];
            const hasChildren = children.length > 0;

            if (hasChildren) {
              return (
                <div key={item.label} className="group relative">
                  <button
                    type="button"
                    aria-haspopup="true"
                    className="flex items-center gap-1 whitespace-nowrap py-2 text-sm font-semibold text-[#0A0A0A]/80 outline-none transition-colors duration-200 hover:text-[#0A0A0A] focus-visible:text-[#0A0A0A] dark:text-white/80 dark:hover:text-white dark:focus-visible:text-white"
                  >
                    {item.label}

                    <ChevronDown
                      className="size-4 transition-transform duration-200 group-hover:rotate-180"
                      strokeWidth={2}
                      aria-hidden="true"
                    />

                    <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#00C98B] transition-all duration-300 group-hover:w-full" />
                  </button>

                  {/* Desktop Tools Dropdown */}
                  <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#111827]">
                      {children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block rounded-lg px-4 py-3 text-sm font-medium text-[#0A0A0A]/75 transition-colors duration-150 hover:bg-[#0A0A0A]/5 hover:text-[#0A0A0A] dark:text-white/75 dark:hover:bg-white/5 dark:hover:text-white"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative whitespace-nowrap py-2 text-sm font-semibold text-[#0A0A0A]/80 outline-none transition-colors duration-200 hover:text-[#0A0A0A] focus-visible:text-[#0A0A0A] dark:text-white/80 dark:hover:text-white dark:focus-visible:text-white"
              >
                {item.label}

                <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#00C98B] transition-all duration-300 group-hover:w-full group-focus-visible:w-full" />
              </Link>
            );
          })}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label={
              resolvedTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#0A0A0A]/15 text-[#0A0A0A] outline-none transition-colors hover:border-[#00C98B]/60 hover:bg-[#0A0A0A]/5 hover:text-[#00C98B] focus-visible:ring-2 focus-visible:ring-[#00C98B] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            {resolvedTheme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          {/* Sign In */}
          <Button
            render={<Link href="/login" />}
            variant="ghost"
            className="h-10 shrink-0 rounded-full px-4 font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A]/5 hover:text-[#00C98B] xl:px-5 dark:text-white dark:hover:bg-white/10"
          >
            Sign In
          </Button>

          {/* Get Started */}
          <Button
            render={<Link href="/signup" />}
            className="h-10 min-w-28 shrink-0 rounded-full bg-[#00C98B] px-4 font-bold text-[#0A0A0A] shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00C98B]/90 hover:shadow-[0_8px_22px_rgba(0,201,139,0.24)] xl:min-w-32 xl:px-5"
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMenuOpen}
          onClick={toggleMobileMenu}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#0A0A0A]/15 text-[#0A0A0A] outline-none transition-colors hover:border-[#00C98B]/60 hover:bg-[#0A0A0A]/5 hover:text-[#00C98B] focus-visible:ring-2 focus-visible:ring-[#00C98B] lg:hidden dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            className="fixed inset-0 top-16 z-40 cursor-default bg-[#0A0A0A]/60 backdrop-blur-sm lg:hidden"
          />

          {/* Mobile Menu */}
          <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#0A0A0A]/10 bg-[#EFF1F3] shadow-2xl lg:hidden dark:border-white/10 dark:bg-[#0A0A0A]">
            <nav
              aria-label="Mobile navigation"
              className="mx-auto flex w-[calc(100%-2rem)] max-w-md flex-col py-5 sm:w-[calc(100%-3rem)]"
            >
              {navigationItems.map((item) => {
                const children = item.children ?? [];
                const hasChildren = children.length > 0;
                const isOpen = openMobileItem === item.label;

                {/* Mobile Tools */ }
                if (hasChildren) {
                  return (
                    <div
                      key={item.label}
                      className="border-b border-[#0A0A0A]/10 dark:border-white/10"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMobileItem(
                            isOpen ? null : item.label,
                          )
                        }
                        aria-expanded={isOpen}
                        className="flex min-h-13 w-full items-center justify-between py-4 text-left text-base font-semibold text-[#0A0A0A]/85 transition-colors hover:text-[#00C98B] dark:text-white/85"
                      >
                        <span>{item.label}</span>

                        <ChevronDown
                          className={`size - 5 text - [#00C98B] transition - transform duration - 200 ${isOpen ? "rotate-180" : ""
                            } `}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </button>

                      {/* Tools Children */}
                      {isOpen && (
                        <div className="mb-3 ml-3 border-l border-[#0A0A0A]/10 pl-4 dark:border-white/10">
                          {children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMenu}
                              className="flex items-center py-3 text-sm font-medium text-[#0A0A0A]/60 transition-colors hover:text-[#00C98B] dark:text-white/60"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                {/* Normal Mobile Item */ }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-13 items-center justify-between border-b border-[#0A0A0A]/10 py-4 text-base font-semibold text-[#0A0A0A]/85 transition-all hover:pl-2 hover:text-[#00C98B] dark:border-white/10 dark:text-white/85"
                  >
                    {item.label}

                    <span className="text-[#00C98B]">↗</span>
                  </Link>
                );
              })}

              {/* Mobile Theme Selector */}
              <div className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-[#0A0A0A]/15 bg-[#0A0A0A]/5 p-1 dark:border-white/15 dark:bg-white/5">
                {themeOptions.map((option) => {
                  const active = theme === option.value;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={active}
                      className={`inline - flex h - 9 items - center justify - center gap - 1.5 rounded - full text - xs font - semibold transition - colors ${active
                        ? "bg-white text-[#0A0A0A] shadow-sm dark:bg-white dark:text-[#0A0A0A]"
                        : "text-[#0A0A0A]/60 hover:text-[#0A0A0A] dark:text-white/60 dark:hover:text-white"
                        } `}
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Auth Buttons */}
              <div className="grid grid-cols-2 gap-2 min-[420px]:gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex h-11 min-w-0 items-center justify-center rounded-full border border-[#0A0A0A]/20 px-3 text-sm font-semibold text-[#0A0A0A] transition-colors hover:border-[#00C98B] hover:text-[#00C98B] dark:border-white/20 dark:text-white"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="flex h-11 min-w-0 items-center justify-center rounded-full bg-[#00C98B] px-3 text-sm font-bold text-[#0A0A0A] transition-opacity hover:opacity-90"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
