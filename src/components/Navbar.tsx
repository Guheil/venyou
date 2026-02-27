"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ROUTES } from "@/lib/routes";

interface NavbarProps {
  variant?: "transparent" | "solid";
  authenticated?: boolean;
}

export default function Navbar({
  variant = "solid",
  authenticated,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = typeof authenticated === "boolean" ? authenticated : Boolean(user);

  const base =
    variant === "transparent"
      ? "bg-transparent"
      : "bg-[#FDFCF9] border-b border-[#E0DDD5]";

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className={`${base} sticky top-0 z-50`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href={ROUTES.home} className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-sm tracking-tight">
            V
          </span>
          <span className="text-xl font-bold tracking-tight text-[#1A1817]">
            Ven<span className="text-[#2A6558]">YOU</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-[#7C7671] transition-colors hover:text-[#1A1817]"
          >
            How It Works
          </Link>
          <Link
            href="/#features"
            className="text-sm font-medium text-[#7C7671] transition-colors hover:text-[#1A1817]"
          >
            Features
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href={ROUTES.dashboard}
                className="text-sm font-medium text-[#7C7671] transition-colors hover:text-[#1A1817]"
              >
                Dashboard
              </Link>
              <Link
                href={ROUTES.createEvent}
                className="rounded-full bg-[#2A6558] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#215249]"
              >
                New Event
              </Link>
            </>
          ) : (
            <>
              <Link
                href={ROUTES.login}
                className="text-sm font-medium text-[#7C7671] transition-colors hover:text-[#1A1817]"
              >
                Sign In
              </Link>
              <Link
                href={ROUTES.register}
                className="rounded-full bg-[#2A6558] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#215249]"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="flex items-center rounded-lg p-1.5 text-[#1A1817] transition-all duration-200 hover:bg-[#EAF2F0] md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className={`transition-transform duration-300 ${
              menuOpen ? "rotate-90" : "rotate-0"
            }`}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[70] transition-opacity duration-300 md:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/65"
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`relative flex h-full flex-col bg-[#0F1715] text-white shadow-2xl transition-[opacity,transform] duration-300 ease-out ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,101,88,0.58)_0%,_rgba(23,41,37,0.92)_45%,_rgba(10,14,13,1)_100%)]" />

          <div className="relative flex items-center justify-between border-b border-white/15 px-6 py-5">
            <Link
              href={ROUTES.home}
              className="flex items-center gap-2"
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white font-bold text-sm tracking-tight">
                V
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                Ven<span className="text-[#9ADBCF]">YOU</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="rounded-lg border border-white/25 bg-black/25 p-2 text-white transition hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="relative flex flex-1 flex-col justify-center gap-5 px-8">
            <Link
              href="/#how-it-works"
              className="text-3xl font-semibold tracking-tight text-white transition hover:text-[#CBEFE8]"
              onClick={() => setMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/#features"
              className="text-3xl font-semibold tracking-tight text-white transition hover:text-[#CBEFE8]"
              onClick={() => setMenuOpen(false)}
            >
              Features
            </Link>
            {isAuthenticated ? (
              <Link
                href={ROUTES.dashboard}
                className="text-3xl font-semibold tracking-tight text-white transition hover:text-[#CBEFE8]"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href={ROUTES.login}
                className="text-3xl font-semibold tracking-tight text-white transition hover:text-[#CBEFE8]"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>

          <div className="relative px-8 pb-10">
            {isAuthenticated ? (
              <Link
                href={ROUTES.createEvent}
                className="block rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-[#15312C] transition hover:bg-[#EAF2F0]"
                onClick={() => setMenuOpen(false)}
              >
                Create New Event
              </Link>
            ) : (
              <Link
                href={ROUTES.register}
                className="block rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-[#15312C] transition hover:bg-[#EAF2F0]"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
