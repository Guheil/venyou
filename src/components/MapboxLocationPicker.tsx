"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import {
  mapboxForwardGeocode,
  mapboxReverseGeocode,
  type MapboxLocation,
} from "@/lib/mapbox";

interface MapboxLocationPickerProps {
  city: string;
  area: string;
  onPick: (location: MapboxLocation) => void;
}

const FALLBACK_CENTER: [number, number] = [121.0244, 14.5547];

export default function MapboxLocationPicker({
  city,
  area,
  onPick,
}: MapboxLocationPickerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [status, setStatus] = useState("Click on the map to pin an exact location.");
  const [ready, setReady] = useState(false);

  const locationQuery = useMemo(
    () => [area.trim(), city.trim()].filter(Boolean).join(", "),
    [area, city]
  );

  useEffect(() => {
    if (!token || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: FALLBACK_CENTER,
      zoom: 10,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const handleMapLoad = () => setReady(true);
    map.on("load", handleMapLoad);

    map.on("click", (event) => {
      const nextLng = Number(event.lngLat.lng.toFixed(6));
      const nextLat = Number(event.lngLat.lat.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLngLat([nextLng, nextLat]);
      } else {
        markerRef.current = new mapboxgl.Marker({ color: "#2A6558" })
          .setLngLat([nextLng, nextLat])
          .addTo(map);
      }

      setStatus("Resolving address...");
      void mapboxReverseGeocode(token, nextLng, nextLat)
        .then((resolved) => {
          const location =
            resolved ??
            ({
              lng: nextLng,
              lat: nextLat,
              address: `${nextLat}, ${nextLng}`,
              city: "",
              area: "",
            } satisfies MapboxLocation);

          onPick(location);
          setStatus(`Pinned: ${location.address}`);
        })
        .catch(() => {
          setStatus("Location pinned, but address lookup failed. You can still edit fields.");
        });
    });

    return () => {
      map.off("load", handleMapLoad);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [onPick, token]);

  useEffect(() => {
    if (!token || !mapRef.current || !ready || !locationQuery) return;

    const timeoutId = window.setTimeout(() => {
      void mapboxForwardGeocode(token, locationQuery)
        .then((result) => {
          if (!result || !mapRef.current) return;
          mapRef.current.flyTo({
            center: [result.lng, result.lat],
            zoom: 12,
            essential: true,
          });
        })
        .catch(() => {
          // User can still place a pin manually.
        });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [locationQuery, ready, token]);

  if (!token) {
    return (
      <div className="rounded-xl border border-dashed border-[#E0DDD5] bg-[#F8F6F1] px-4 py-5 text-xs text-[#7C7671]">
        Add `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` to enable map pinning.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={mapContainerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-[#C8E0DA] bg-[#EAF2F0]"
      />
      <p className="mt-2 text-xs text-[#7C7671]">{status}</p>
    </div>
  );
}
