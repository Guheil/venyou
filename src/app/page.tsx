import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeIntroLoader from "@/components/HomeIntroLoader";
import {
  Sparkles,
  MapPin,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Zap,
  Users,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: <Sparkles size={22} className="text-[#2A6558]" />,
    title: "AI-Powered Matching",
    desc: "Our NLP engine understands your event context and matches venues with precision — from vibe to budget.",
  },
  {
    icon: <MapPin size={22} className="text-[#2A6558]" />,
    title: "Location Intelligence",
    desc: "Results are sorted nearest to farthest, with travel time estimates so your guests arrive stress-free.",
  },
  {
    icon: <BarChart3 size={22} className="text-[#2A6558]" />,
    title: "Full Cost Analysis",
    desc: "Per-head pricing, venue rental, catering estimates, and hidden fees — all laid out transparently.",
  },
  {
    icon: <ShieldCheck size={22} className="text-[#2A6558]" />,
    title: "Secure & Private",
    desc: "Bank-grade authentication. Your event plans stay yours — no data sold, ever.",
  },
];

const steps = [
  {
    num: "01",
    icon: <CalendarDays size={20} className="text-[#2A6558]" />,
    title: "Describe Your Event",
    desc: "Walk through our guided 5-step form. Tell us the occasion, guest count, date, and your preferences.",
  },
  {
    num: "02",
    icon: <Zap size={20} className="text-[#2A6558]" />,
    title: "AI Processes",
    desc: "Our engine analyses thousands of venues against your criteria using natural language understanding.",
  },
  {
    num: "03",
    icon: <MapPin size={20} className="text-[#2A6558]" />,
    title: "Ranked Recommendations",
    desc: "Get a curated list from nearest to farthest, each with a match score, details, and cost breakdown.",
  },
  {
    num: "04",
    icon: <Users size={20} className="text-[#2A6558]" />,
    title: "Book Your Venue",
    desc: "Shortlist favourites, compare side-by-side, and take the next step toward your perfect event.",
  },
];

const occasions = [
  "Wedding Reception",
  "Corporate Conference",
  "Birthday Celebration",
  "Product Launch",
  "Team Building",
  "Gala Dinner",
  "Graduation Party",
  "Networking Event",
];

const PAGE_MAX = "mx-auto w-full max-w-[1440px]";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <Navbar />
      <HomeIntroLoader />

      {/* HERO */}
      <section className="hero-stage relative overflow-hidden px-6 pt-20 pb-28 md:pt-28 md:pb-36">
        <div className="hero-mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="hero-ring hero-ring-a pointer-events-none absolute -top-36 -right-36 h-[520px] w-[520px] rounded-full" />
        <div className="hero-ring hero-ring-b pointer-events-none absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full" />
        <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#2A6558]/6 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-[#2A6558]/5 blur-3xl" />
        <div className={`${PAGE_MAX} relative`}>
          <div className="relative mx-auto max-w-4xl text-center">
          <span className="hero-gsap-item mb-6 inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-4 py-1.5 text-xs font-semibold text-[#2A6558]">
            <Sparkles size={12} />
            AI Venue Discovery — Now Available
          </span>
          <h1 className="hero-gsap-item mb-6 text-5xl font-extrabold leading-tight tracking-tight text-[#1A1817] md:text-6xl lg:text-7xl">
            Your Event Deserves
            <br />
            <span className="text-[#2A6558]">The Perfect Venue</span>
          </h1>
          <p className="hero-gsap-item mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#7C7671] md:text-xl">
            Tell us about your event — VenYOU&apos;s AI engine finds and ranks
            venues near you in seconds, complete with full cost analysis and
            smart insights.
          </p>
          <div className="hero-gsap-item flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/create-event"
              className="hero-cta-primary flex w-full items-center justify-center rounded-full bg-[#2A6558] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2A6558]/30 transition-all hover:bg-[#215249] hover:shadow-xl sm:w-[250px]"
            >
              <span className="hero-cta-sheen" aria-hidden />
              <span className="hero-cta-content">
                <span>Find My Venue</span>
                <ArrowRight size={18} className="hero-cta-icon" />
              </span>
            </Link>
            <Link
              href="/register"
              className="hero-cta-secondary flex w-full items-center justify-center rounded-full border border-[#E0DDD5] bg-white px-8 py-3.5 text-base font-semibold text-[#1A1817] transition-all hover:border-[#2A6558] hover:text-[#2A6558] sm:w-[250px]"
            >
              Create Account
            </Link>
          </div>
            <div className="mt-12 flex flex-wrap justify-center gap-2">
              {occasions.map((o) => (
                <span
                  key={o}
                  className="hero-gsap-chip rounded-full border border-[#E0DDD5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#7C7671]"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STAT BAR */}
      <section className="gsap-reveal-section border-y border-[#E0DDD5] bg-white">
        <div className={`${PAGE_MAX} px-6`}>
          <div className="grid grid-cols-2 divide-x divide-[#E0DDD5] md:grid-cols-4">
            {[
              { value: "10,000+", label: "Venues Listed" },
              { value: "500+", label: "Cities Covered" },
              { value: "98%", label: "Match Accuracy" },
              { value: "30s", label: "Avg. Result Time" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-8 px-4">
                <span className="text-3xl font-extrabold text-[#1A1817]">{stat.value}</span>
                <span className="mt-1 text-sm text-[#7C7671]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="gsap-reveal-section px-6 py-24">
        <div className={PAGE_MAX}>
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
              Why VenYOU
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#1A1817]">
              Everything You Need to Plan With Confidence
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-[#E0DDD5] bg-white p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2F0]">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold text-[#1A1817]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#7C7671]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="gsap-reveal-section bg-white px-6 py-24">
        <div className={PAGE_MAX}>
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-[#2A6558]">The Process</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#1A1817]">From Idea to Venue in 4 Steps</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col">
                {i < steps.length - 1 && (
                  <div className="absolute top-5 left-1/2 hidden h-px w-full translate-x-1/2 border-t border-dashed border-[#E0DDD5] md:block" />
                )}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#E0DDD5] bg-[#EAF2F0] relative z-10">
                  {step.icon}
                </div>
                <span className="mb-1 text-xs font-semibold text-[#2A6558]">{step.num}</span>
                <h3 className="mb-2 font-semibold text-[#1A1817]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#7C7671]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* AI INSIGHT PREVIEW */}
      <section className="gsap-reveal-section bg-[#F8F6F1] px-6 py-24">
        <div className={PAGE_MAX}>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#DDD8CF] bg-[#FCFBF8] shadow-sm">
            <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[#7BC4B8]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-[#2A6558]/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_45%)]" />

            <div className="relative grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-8 md:p-12 lg:p-14">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                  <Sparkles size={12} /> AI Driven Intelligence
                </span>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-[#1A1817] md:text-4xl">
                  Smart Insights,
                  <br />
                  Not Just Venue Lists
                </h2>
                <p className="max-w-xl leading-relaxed text-[#7C7671]">
                  VenYOU interprets your event brief, extracts intent and tone, then explains why each venue is relevant
                  so your team can decide faster with confidence.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: <MapPin size={13} className="text-[#2A6558]" />, label: "Distance-aware ranking" },
                    { icon: <BarChart3 size={13} className="text-[#2A6558]" />, label: "Transparent cost signals" },
                    { icon: <ShieldCheck size={13} className="text-[#2A6558]" />, label: "Reliable data quality" },
                    { icon: <Sparkles size={13} className="text-[#2A6558]" />, label: "Contextual AI reasoning" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E1D8] bg-white px-3.5 py-2.5 text-xs font-medium text-[#44504C]"
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  ))}
                </div>

                <Link
                  href="/create-event"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1817] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A6558]"
                >
                  Try it now <ChevronRight size={15} />
                </Link>
              </div>

              <div className="border-t border-[#E7E3DA] bg-[#F2F5F4] p-8 md:p-12 lg:border-l lg:border-t-0">
                <div className="mx-auto w-full max-w-md">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest">
                    <span className="text-[#6B7773]">Live Recommendation</span>
                    <span className="rounded-full bg-[#EAF2F0] px-2.5 py-1 text-[#2A6558]">AI confidence 96%</span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#DAD6CC] bg-white shadow-[0_12px_40px_rgba(26,24,23,0.08)]">
                    <div className="relative h-36 bg-gradient-to-br from-[#BDD7D2] via-[#D6E8E4] to-[#F0F6F4]">
                      <div className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-[#2A6558]">
                        Garden Venue
                      </div>
                      <div className="absolute bottom-4 right-4 rounded-full bg-[#1A1817]/80 px-2.5 py-1 text-[10px] font-semibold text-white">
                        180 pax
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-base font-bold text-[#1A1817]">The Garden Terrace</span>
                        <span className="rounded-full bg-[#EAF2F0] px-2.5 py-0.5 text-xs font-semibold text-[#2A6558]">
                          96% match
                        </span>
                      </div>

                      <div className="mb-4 rounded-xl border border-[#C8E0DA] bg-[#ECF5F3] px-3.5 py-3 text-xs leading-relaxed text-[#2A6558]">
                        <span className="font-semibold">AI Insight: </span>
                        Strong fit for garden-themed celebrations with flexible indoor backup and balanced per-head cost.
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-[#F8F6F1] px-3 py-2">
                          <p className="text-[#7C7671]">Distance</p>
                          <p className="mt-0.5 font-semibold text-[#1A1817]">1.2 km</p>
                        </div>
                        <div className="rounded-lg bg-[#F8F6F1] px-3 py-2">
                          <p className="text-[#7C7671]">Price</p>
                          <p className="mt-0.5 font-semibold text-[#2A6558]">PHP 850 / head</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#DAD6CC] bg-white/80 px-4 py-2.5 text-xs text-[#6A6460]">
                    <span>Nearest suitable venue in your budget</span>
                    <span className="font-semibold text-[#2A6558]">Top pick</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gsap-reveal-section px-6 py-24">
        <div className={PAGE_MAX}>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#D8D3C9] bg-[#151413] p-8 md:p-12 lg:p-14">
            <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#7BC4B8]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-[#2A6558]/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0)_55%)]" />

            <div className="relative grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#BFE2DB]">
                  <Sparkles size={11} /> Start Planning
                </span>
                <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                  Ready to lock in your
                  <br />
                  <span className="text-[#7BC4B8]">perfect venue match?</span>
                </h2>
                <p className="max-w-2xl text-[#B0A9A4] leading-relaxed">
                  Build your event brief in minutes and let VenYOU surface the top venues by fit, location, and budget.
                  No spreadsheets. No guesswork.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    { icon: <ShieldCheck size={12} />, label: "Private by default" },
                    { icon: <Zap size={12} />, label: "30-second matching" },
                    { icon: <BarChart3 size={12} />, label: "Transparent costing" },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85"
                    >
                      {item.icon}
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/55">Get Started</p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/register"
                    className="flex items-center justify-center gap-2 rounded-full bg-[#7BC4B8] px-6 py-3 text-sm font-semibold text-[#10201D] transition hover:bg-[#96D8CD]"
                  >
                    Create Free Account <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/create-event"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/25 bg-transparent px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white hover:bg-white/10"
                  >
                    Start Without Account
                  </Link>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
                  {[
                    { value: "98%", label: "Match Fit" },
                    { value: "500+", label: "Cities" },
                    { value: "24/7", label: "Planning" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-lg font-extrabold text-white">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/55">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

