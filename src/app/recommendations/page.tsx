import Link from "next/link";
import AppShell from "@/components/AppShell";
import VenueCard, { type Venue } from "@/components/VenueCard";
import {
  Sparkles,
  SlidersHorizontal,
  MapPin,
  BarChart3,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────
const mockVenues: Venue[] = [
  {
    id: "1",
    name: "The Garden Terrace by Casa Verde",
    type: "Garden / Outdoor Venue",
    address: "32 McKinley Rd, BGC, Taguig",
    distance: 1.2,
    capacity: 200,
    rating: 4.9,
    reviewCount: 312,
    pricePerHead: 850,
    totalEstimate: 170000,
    imageColor: "linear-gradient(135deg, #A8D5C2 0%, #C8E6DC 100%)",
    tags: ["Garden", "Outdoor", "Romantic"],
    aiNote:
      "Strongly aligns with your romantic outdoor brief. The venue's lush greenery and natural lighting are perfect for a Garden-themed wedding reception in the evening.",
    match: 96,
  },
  {
    id: "2",
    name: "Grand Pavilion, Makati Shangri-La",
    type: "Hotel Ballroom",
    address: "Ayala Ave cor Makati Ave, Makati City",
    distance: 3.5,
    capacity: 350,
    rating: 4.8,
    reviewCount: 528,
    pricePerHead: 1800,
    totalEstimate: 360000,
    imageColor: "linear-gradient(135deg, #B8A9C9 0%, #D4C9E2 100%)",
    tags: ["Ballroom", "Luxury", "Full Service"],
    aiNote:
      "Premium ballroom with full banquet service. Suitable for a large, formal reception. Higher budget but comprehensive — AV, lighting, catering, and accommodation all included.",
    match: 89,
  },
  {
    id: "3",
    name: "Circa 1900 Heritage Estate",
    type: "Heritage / Events Space",
    address: "Malugay St, San Antonio Village, Makati",
    distance: 4.8,
    capacity: 150,
    rating: 4.7,
    reviewCount: 187,
    pricePerHead: 950,
    totalEstimate: 142500,
    imageColor: "linear-gradient(135deg, #F0D9B5 0%, #E8C99A 100%)",
    tags: ["Heritage", "Intimate", "Unique"],
    aiNote:
      "Charming heritage house setting ideal for intimate gatherings. The colonial architecture gives a timeless, elegant backdrop. Note: capacity limited to 150 pax.",
    match: 84,
  },
  {
    id: "4",
    name: "Sky Lounge at The Podium",
    type: "Rooftop / Events Venue",
    address: "12 ADB Ave, Mandaluyong City",
    distance: 5.9,
    capacity: 180,
    rating: 4.6,
    reviewCount: 245,
    pricePerHead: 700,
    totalEstimate: 126000,
    imageColor: "linear-gradient(135deg, #89BCDE 0%, #B5D5ED 100%)",
    tags: ["Rooftop", "City View", "Modern"],
    aiNote:
      "Stunning city skyline views. Cost-effective rooftop option. Best for evening events — sunsets here are spectacular. Outdoor section may require weather plan.",
    match: 79,
  },
  {
    id: "5",
    name: "Fernwood Gardens",
    type: "Garden Events Venue",
    address: "Fernwood Dr, Bonifacio Global City",
    distance: 7.3,
    capacity: 300,
    rating: 4.5,
    reviewCount: 421,
    pricePerHead: 650,
    totalEstimate: 195000,
    imageColor: "linear-gradient(135deg, #B2DFDB 0%, #80CBC4 100%)",
    tags: ["Garden", "Large Capacity", "Classic"],
    aiNote:
      "One of BGC's most well-known garden venues. Can accommodate 300 pax and offers multiple function room combinations. Reliable choice for medium-large weddings.",
    match: 75,
  },
  {
    id: "6",
    name: "One Esplanade Manila",
    type: "Convention / Grand Events",
    address: "CCP Complex, Roxas Blvd, Pasay City",
    distance: 9.1,
    capacity: 1000,
    rating: 4.7,
    reviewCount: 634,
    pricePerHead: 500,
    totalEstimate: 50000,
    imageColor: "linear-gradient(135deg, #CFD8DC 0%, #B0BEC5 100%)",
    tags: ["Convention", "Grand Scale", "Premium"],
    aiNote:
      "Best suited if event scales beyond 300 guests. World-class convention facility with full AV production. Ideal for product launches, galas, and large corporate events.",
    match: 68,
  },
];

const costSummary = {
  lowestPerHead: Math.min(...mockVenues.map((v) => v.pricePerHead)),
  highestPerHead: Math.max(...mockVenues.map((v) => v.pricePerHead)),
  avgPerHead: Math.round(mockVenues.reduce((s, v) => s + v.pricePerHead, 0) / mockVenues.length),
  lowestTotal: Math.min(...mockVenues.map((v) => v.totalEstimate)),
  highestTotal: Math.max(...mockVenues.map((v) => v.totalEstimate)),
};

export default function RecommendationsPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 page-fade">
        {/* Header */}
        <div className="mb-8">
          <Link href="/create-event" className="mb-4 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]">
            <ArrowLeft size={15} /> Back to Event Details
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={18} className="text-[#2A6558]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">AI Recommendations</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
                {mockVenues.length} Venues Found
              </h1>
              <p className="mt-1 text-sm text-[#7C7671]">
                Sorted by AI match score and proximity · Wedding Reception · BGC, Taguig · 200 guests
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558]">
              <SlidersHorizontal size={15} /> Filter & Sort
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* ── Sidebar ── */}
          <aside className="flex flex-col gap-5 lg:col-span-1">
            {/* Cost snapshot */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-[#2A6558]" />
                <h3 className="text-sm font-semibold text-[#1A1817]">Cost Analysis</h3>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#7C7671]">
                    <TrendingDown size={12} className="text-[#27AE60]" /> Lowest / head
                  </span>
                  <span className="font-semibold text-[#1A1817]">₱{costSummary.lowestPerHead.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#7C7671]">
                    <Minus size={12} className="text-[#2A6558]" /> Average / head
                  </span>
                  <span className="font-semibold text-[#1A1817]">₱{costSummary.avgPerHead.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#7C7671]">
                    <TrendingUp size={12} className="text-[#C0392B]" /> Highest / head
                  </span>
                  <span className="font-semibold text-[#1A1817]">₱{costSummary.highestPerHead.toLocaleString()}</span>
                </div>
                <div className="border-t border-[#E0DDD5] pt-3">
                  <p className="text-xs text-[#7C7671] mb-2">Total cost range</p>
                  <p className="text-sm font-bold text-[#1A1817]">
                    ₱{costSummary.lowestTotal.toLocaleString()} – ₱{costSummary.highestTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Location filter */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin size={15} className="text-[#2A6558]" />
                <h3 className="text-sm font-semibold text-[#1A1817]">Map View</h3>
              </div>
              <div className="flex h-36 items-center justify-center rounded-xl bg-[#EAF2F0] border border-[#C8E0DA]">
                <div className="text-center">
                  <MapPin size={24} className="mx-auto text-[#2A6558] mb-1" />
                  <p className="text-xs text-[#2A6558] font-medium">BGC, Taguig</p>
                  <p className="text-[10px] text-[#7C7671]">{mockVenues.length} venues nearby</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-[#7C7671] text-center">
                Interactive map coming soon
              </p>
            </div>

            {/* AI summary */}
            <div className="rounded-2xl bg-[#1A1817] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-[#7BC4B8]" />
                <span className="text-xs font-semibold text-[#7BC4B8] uppercase tracking-widest">AI Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">
                Based on your <strong className="text-white">romantic outdoor wedding</strong> brief for 200 guests in <strong className="text-white">BGC</strong>, garden venues dominate the top matches. Budget-wise, the median venue costs ~₱950/head.
              </p>
            </div>

            {/* Filter pills */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#1A1817]">Quick Filters</h3>
              <div className="flex flex-wrap gap-2">
                {["Garden", "Ballroom", "Rooftop", "Heritage", "Indoor", "Outdoor", "Under ₱1000/head", "High Match"].map((tag) => (
                  <button key={tag} className="rounded-full border border-[#E0DDD5] px-3 py-1 text-xs font-medium text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Venue grid ── */}
          <div className="lg:col-span-3">
            <div className="grid gap-6 sm:grid-cols-2">
              {mockVenues.map((v, i) => (
                <VenueCard key={v.id} venue={v} rank={i + 1} />
              ))}
            </div>

            {/* Load more */}
            <div className="mt-8 flex justify-center">
              <button className="rounded-full border border-[#E0DDD5] bg-white px-8 py-3 text-sm font-medium text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]">
                Load More Venues
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
