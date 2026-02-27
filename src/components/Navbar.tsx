"use client";

import Link from "next/link";
import { useState } from "react";
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
          className="flex items-center md:hidden text-[#1A1817]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[#E0DDD5] bg-[#FDFCF9] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-[#7C7671]"
              onClick={() => setMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-[#7C7671]"
              onClick={() => setMenuOpen(false)}
            >
              Features
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href={ROUTES.dashboard}
                  className="text-sm font-medium text-[#7C7671]"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href={ROUTES.createEvent}
                  className="rounded-full bg-[#2A6558] px-5 py-2 text-center text-sm font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  New Event
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={ROUTES.login}
                  className="text-sm font-medium text-[#7C7671]"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href={ROUTES.register}
                  className="rounded-full bg-[#2A6558] px-5 py-2 text-center text-sm font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
