"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { mapboxForwardGeocode } from "@/lib/mapbox";

interface RecommendationsMapVenue {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface RecommendationsMapProps {
  eventCity: string;
  eventArea: string;
  venues: RecommendationsMapVenue[];
  heightClassName?: string;
  statusClassName?: string;
  maxVenues?: number;
  mapStyle?: string;
}

const FALLBACK_CENTER: [number, number] = [121.0244, 14.5547];

export default function RecommendationsMap({
  eventCity,
  eventArea,
  venues,
  heightClassName = "h-44",
  statusClassName = "mt-2 text-center text-[10px] text-[#7C7671]",
  maxVenues = 6,
  mapStyle = "mapbox://styles/mapbox/streets-v12",
}: RecommendationsMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const userInteractedRef = useRef(false);
  const geocodeCacheRef = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Map ready.");

  const centerQuery = useMemo(
    () => [eventArea.trim(), eventCity.trim()].filter(Boolean).join(", "),
    [eventArea, eventCity]
  );

  useEffect(() => {
    if (!token || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: FALLBACK_CENTER,
      zoom: 10,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    const handleMapLoad = () => setReady(true);
    const markInteraction = () => {
      userInteractedRef.current = true;
    };
    map.on("load", handleMapLoad);
    map.on("dragstart", markInteraction);
    map.on("zoomstart", markInteraction);
    map.on("rotatestart", markInteraction);
    map.on("pitchstart", markInteraction);

    return () => {
      map.off("load", handleMapLoad);
      map.off("dragstart", markInteraction);
      map.off("zoomstart", markInteraction);
      map.off("rotatestart", markInteraction);
      map.off("pitchstart", markInteraction);
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [mapStyle, token]);

  useEffect(() => {
    if (!token || !mapRef.current || !ready) return;

    let cancelled = false;
    const map = mapRef.current;
    userInteractedRef.current = false;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    void (async () => {
      setStatus("Loading nearby venues on map...");

      let centerPoint = { lng: FALLBACK_CENTER[0], lat: FALLBACK_CENTER[1] };
      if (centerQuery) {
        const centerResult = await mapboxForwardGeocode(token, centerQuery);
        if (centerResult) {
          centerPoint = { lng: centerResult.lng, lat: centerResult.lat };
        }
      }

      if (cancelled) return;

      const venueQueries = venues.slice(0, maxVenues).map((venue) => ({
        id: venue.id,
        name: venue.name,
        query: `${venue.address}, ${venue.city}`,
      }));

      const points: Array<{ id: string; name: string; lng: number; lat: number }> = [];

      for (const venueQuery of venueQueries) {
        if (cancelled) return;

        const cached = geocodeCacheRef.current.get(venueQuery.query);
        if (cached) {
          points.push({ ...venueQuery, ...cached });
          continue;
        }

        const geocoded = await mapboxForwardGeocode(token, venueQuery.query);
        if (!geocoded) continue;

        const point = { id: venueQuery.id, name: venueQuery.name, lng: geocoded.lng, lat: geocoded.lat };
        geocodeCacheRef.current.set(venueQuery.query, { lng: point.lng, lat: point.lat });
        points.push(point);
      }

      if (cancelled) return;

      const centerMarker = new mapboxgl.Marker({ color: "#1A1817" })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 16 }).setHTML(
            `<strong>Event Area</strong><br/>${eventArea || eventCity || "Selected location"}`
          )
        )
        .addTo(map);
      markerRefs.current.push(centerMarker);

      points.forEach((point, index) => {
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className =
          "flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#27AE60] to-[#2A6558] text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(39,174,96,0.35)] ring-2 ring-white";
        markerElement.textContent = String(index + 1);

        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat([point.lng, point.lat])
          .setPopup(new mapboxgl.Popup({ offset: 14 }).setText(point.name))
          .addTo(map);
        markerRefs.current.push(marker);
      });

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([centerPoint.lng, centerPoint.lat]);
      points.forEach((point) => bounds.extend([point.lng, point.lat]));
      if (!userInteractedRef.current) {
        map.fitBounds(bounds, { padding: 38, maxZoom: 13, duration: 650 });
      }

      setStatus(
        points.length > 0
          ? `${points.length} nearby venues mapped.`
          : "Unable to geocode venue addresses right now."
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [centerQuery, eventArea, eventCity, maxVenues, ready, token, venues]);

  if (!token) {
    return (
      <div className="rounded-xl border border-dashed border-[#E0DDD5] bg-[#F8F6F1] p-4 text-[11px] text-[#7C7671]">
        Add `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` to enable live map view.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={mapContainerRef}
        className={`${heightClassName} w-full overflow-hidden rounded-xl border border-[#C8E0DA] bg-[#EAF2F0]`}
      />
      <p className={statusClassName}>{status}</p>
    </div>
  );
}
