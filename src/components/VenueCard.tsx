import { MapPin, Users, Star, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";

export interface Venue {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: number; // km
  capacity: number;
  rating: number;
  reviewCount: number;
  pricePerHead: number;
  totalEstimate: number;
  imageColor: string; // tailwind bg color fallback
  tags: string[];
  aiNote: string;
  match: number; // 0-100 AI match score
}

interface VenueCardProps {
  venue: Venue;
  rank: number;
}

export default function VenueCard({ venue, rank }: VenueCardProps) {
  const matchColor =
    venue.match >= 90
      ? "text-[#27AE60] bg-[#EAFAF1]"
      : venue.match >= 75
      ? "text-[#2A6558] bg-[#EAF2F0]"
      : "text-[#7C7671] bg-[#F8F6F1]";

  return (
    <div className="venue-card rounded-2xl border border-[#E0DDD5] bg-[#FDFCF9] overflow-hidden">
      {/* Image / color block */}
      <div
        className={`relative h-44 ${venue.imageColor} flex items-end p-4`}
        style={{ background: venue.imageColor }}
      >
        {/* Rank badge */}
        <span className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-[#1A1817] shadow">
          #{rank}
        </span>
        {/* Match badge */}
        <span
          className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold ${matchColor}`}
        >
          {venue.match}% match
        </span>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {venue.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-[#1A1817]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#1A1817] leading-snug">
              {venue.name}
            </h3>
            <p className="text-xs text-[#7C7671] mt-0.5">{venue.type}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-[#1A1817]">
              {venue.rating}
            </span>
            <span className="text-xs text-[#7C7671]">({venue.reviewCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={13} className="text-[#7C7671] shrink-0" />
          <p className="text-xs text-[#7C7671] truncate">{venue.address}</p>
          <span className="ml-auto shrink-0 text-xs font-medium text-[#2A6558]">
            {venue.distance} km away
          </span>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 divide-x divide-[#E0DDD5] rounded-xl border border-[#E0DDD5] overflow-hidden">
          <div className="flex flex-col items-center py-3 px-2">
            <Users size={14} className="text-[#7C7671] mb-1" />
            <span className="text-xs font-semibold text-[#1A1817]">
              {venue.capacity}
            </span>
            <span className="text-[10px] text-[#7C7671]">capacity</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2">
            <DollarSign size={14} className="text-[#7C7671] mb-1" />
            <span className="text-xs font-semibold text-[#1A1817]">
              ₱{venue.pricePerHead.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#7C7671]">per head</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 bg-[#EAF2F0]">
            <span className="text-[10px] text-[#7C7671] mb-1">Total Est.</span>
            <span className="text-xs font-bold text-[#2A6558]">
              ₱{venue.totalEstimate.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#7C7671]">estimate</span>
          </div>
        </div>

        {/* AI note */}
        <p className="mb-4 rounded-lg bg-[#EAF2F0] px-3 py-2.5 text-xs leading-relaxed text-[#215249] border border-[#C8E0DA]">
          <span className="font-semibold">AI Insight: </span>
          {venue.aiNote}
        </p>

        <Link
          href={`/venue/${venue.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1817] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A6558]"
        >
          View Details
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
