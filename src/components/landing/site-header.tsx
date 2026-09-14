"use client";

import Link from "next/link";
import { Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/theme-provider";

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const navigationItems = [
  { label: "Live Jobs", href: "#live-jobs" },
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
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
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A] shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
      <div className="mx-auto grid h-16 w-[calc(100%-2rem)] max-w-[1756px] grid-cols-[1fr_auto] items-center sm:w-[calc(100%-3rem)] lg:h-[72px] lg:w-[calc(100%-7rem)] lg:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link
          href="/"
          aria-label="UpScore home"
          className="flex h-full w-fit min-w-0 items-center rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#00C98B]"
        >
          <img
            src="/upscore-logo.png"
            alt="UpScore"
            width={50}
            height={40}
            className="block h-14 w-auto max-w-full object-contain sm:h-16 lg:h-[70px]"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-5 lg:flex xl:gap-7 2xl:gap-9"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative whitespace-nowrap py-2 text-sm font-semibold text-white/80 outline-none transition-colors duration-200 hover:text-white focus-visible:text-white"
            >
              {item.label}

              <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#00C98B] transition-all duration-300 group-hover:w-full group-focus-visible:w-full" />
            </Link>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
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
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white outline-none transition-colors hover:border-[#00C98B]/60 hover:bg-white/10 hover:text-[#00C98B] focus-visible:ring-2 focus-visible:ring-[#00C98B]"
          >
            {resolvedTheme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          <Button
            render={<Link href="/login" />}
            variant="ghost"
            className="h-10 shrink-0 rounded-full px-4 font-semibold text-white hover:bg-white/10 hover:text-[#00C98B] xl:px-5"
          >
            Sign In
          </Button>

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
          aria-label={
            isMenuOpen
              ? "Close navigation"
              : "Open navigation"
          }
          aria-expanded={isMenuOpen}
          onClick={() =>
            setIsMenuOpen((current) => !current)
          }
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white outline-none transition-colors hover:border-[#00C98B]/60 hover:bg-white/10 hover:text-[#00C98B] focus-visible:ring-2 focus-visible:ring-[#00C98B] lg:hidden"
        >
          {isMenuOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            className="fixed inset-0 top-16 z-40 cursor-default bg-[#0A0A0A]/60 backdrop-blur-sm lg:hidden"
          />

          <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-[#0A0A0A] shadow-2xl lg:hidden">
            <nav
              aria-label="Mobile navigation"
              className="mx-auto flex w-[calc(100%-2rem)] max-w-md flex-col py-5 sm:w-[calc(100%-3rem)]"
            >
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex min-h-13 items-center justify-between border-b border-white/10 py-4 text-base font-semibold text-white/85 transition-all hover:pl-2 hover:text-[#00C98B]"
                >
                  {item.label}

                  <span className="text-[#00C98B]">
                    ↗
                  </span>
                </Link>
              ))}

              <div className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-white/15 bg-white/5 p-1">
                {themeOptions.map((option) => {
                  const active = theme === option.value;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={active}
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${active
                        ? "bg-white text-[#0A0A0A] shadow-sm"
                        : "text-white/60 hover:text-white"
                        }`}
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 min-[420px]:gap-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex h-11 min-w-0 items-center justify-center rounded-full border border-white/20 px-3 text-sm font-semibold text-white transition-colors hover:border-[#00C98B] hover:text-[#00C98B]"
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