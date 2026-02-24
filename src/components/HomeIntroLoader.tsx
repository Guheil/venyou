"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function HomeIntroLoader() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const heroItems = ".hero-gsap-item";
    const chips = ".hero-gsap-chip";
    const sections = ".gsap-reveal-section";

    if (prefersReduced) {
      gsap.set([heroItems, chips, sections], {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
      });
      gsap.set(rootRef.current, { autoAlpha: 0, display: "none", pointerEvents: "none" });
      return;
    }

    gsap.set([heroItems, sections], { autoAlpha: 0, y: 28, filter: "blur(8px)" });
    gsap.set(chips, { autoAlpha: 0, y: 14, filter: "blur(5px)" });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        if (!rootRef.current) return;
        gsap.set(rootRef.current, { autoAlpha: 0, display: "none", pointerEvents: "none" });
      },
    });

    tl.fromTo(".intro-word", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.58 })
      .to(
        ".intro-progress-fill",
        { scaleX: 1, duration: 0.9, ease: "power2.inOut", transformOrigin: "left center" },
        0.18
      )
      .to(".intro-tagline", { autoAlpha: 1, y: 0, duration: 0.45 }, 0.44)
      .to(".intro-word", { y: -22, autoAlpha: 0, stagger: 0.05, duration: 0.4 }, 1.08)
      .to(".intro-tagline", { y: -10, autoAlpha: 0, duration: 0.32 }, 1.08)
      .to(".intro-panel-top", { yPercent: -100, duration: 0.95, ease: "power4.inOut" }, 1.25)
      .to(".intro-panel-bottom", { yPercent: 100, duration: 0.95, ease: "power4.inOut" }, 1.25)
      .to(rootRef.current, { autoAlpha: 0, duration: 0.35 }, 1.92)
      .to(heroItems, { autoAlpha: 1, y: 0, filter: "blur(0px)", stagger: 0.1, duration: 0.72 }, 1.5)
      .to(chips, { autoAlpha: 1, y: 0, filter: "blur(0px)", stagger: 0.05, duration: 0.52 }, 1.9)
      .to(sections, { autoAlpha: 1, y: 0, filter: "blur(0px)", stagger: 0.08, duration: 0.62 }, 2.05);

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden>
      <div className="intro-panel-top absolute inset-x-0 top-0 h-1/2 bg-[#1A1817]" />
      <div className="intro-panel-bottom absolute inset-x-0 bottom-0 h-1/2 bg-[#1A1817]" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 30% at 20% 20%, rgba(123,196,184,0.25), transparent 70%), radial-gradient(40% 30% at 80% 80%, rgba(123,196,184,0.12), transparent 70%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Loading Experience</div>
          <div className="text-5xl font-extrabold tracking-tight text-white md:text-6xl">
            <span className="intro-word inline-block">Ven</span>
            <span className="intro-word inline-block text-[#7BC4B8]">YOU</span>
          </div>
          <p className="intro-tagline mt-3 text-sm text-white/60 opacity-0 [transform:translateY(8px)]">
            AI-powered venue discovery
          </p>
          <div className="mx-auto mt-6 h-[3px] w-56 overflow-hidden rounded-full bg-white/20">
            <div className="intro-progress-fill h-full scale-x-0 rounded-full bg-[#7BC4B8]" />
          </div>
        </div>
      </div>
    </div>
  );
}
