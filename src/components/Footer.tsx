"use client";

import Link from "next/link";
import { useState } from "react";
import LegalModal from "@/components/LegalModal";
import { privacyPolicy, termsOfService } from "@/lib/legalContent";

export default function Footer() {
  const [openLegal, setOpenLegal] = useState<"terms" | "privacy" | null>(null);
  const activeDocument =
    openLegal === "terms" ? termsOfService : openLegal === "privacy" ? privacyPolicy : null;

  return (
    <>
      <footer className="border-t border-[#E0DDD5] bg-[#FDFCF9]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-sm font-bold text-white">
                  V
                </span>
                <span className="text-xl font-bold tracking-tight text-[#1A1817]">
                  Ven<span className="text-[#2A6558]">YOU</span>
                </span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-[#7C7671]">
                AI-powered venue discovery for every occasion. From intimate gatherings to grand celebrations, we find the
                perfect space for you.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#1A1817]">
                Product
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "Features", href: "/#features" },
                  { label: "Create Event", href: "/create-event" },
                  { label: "Dashboard", href: "/dashboard" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[#7C7671] transition-colors hover:text-[#2A6558]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#1A1817]">
                Account
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-[#7C7671] transition-colors hover:text-[#2A6558]"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="text-sm text-[#7C7671] transition-colors hover:text-[#2A6558]"
                  >
                    Register
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setOpenLegal("privacy")}
                    className="text-left text-sm text-[#7C7671] transition-colors hover:text-[#2A6558]"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setOpenLegal("terms")}
                    className="text-left text-sm text-[#7C7671] transition-colors hover:text-[#2A6558]"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#E0DDD5] pt-6 sm:flex-row">
            <p className="text-xs text-[#7C7671]">
              Copyright {new Date().getFullYear()} VenYOU. All rights reserved.
            </p>
            <p className="text-xs text-[#7C7671]">
              Powered by AI and NLP. Built with Next.js.
            </p>
          </div>
        </div>
      </footer>

      {activeDocument && (
        <LegalModal
          open={Boolean(activeDocument)}
          title={activeDocument.title}
          lastUpdated={activeDocument.lastUpdated}
          intro={activeDocument.intro}
          sections={activeDocument.sections}
          onClose={() => setOpenLegal(null)}
        />
      )}
    </>
  );
}
