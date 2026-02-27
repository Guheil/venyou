export interface MapboxLocation {
  lng: number;
  lat: number;
  address: string;
  city: string;
  area: string;
}

interface MapboxFeatureContext {
  id?: string;
  text?: string;
}

interface MapboxFeature {
  place_name?: string;
  center?: [number, number];
  text?: string;
  context?: MapboxFeatureContext[];
}

interface MapboxGeocodingResponse {
  features?: MapboxFeature[];
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function pickContextText(
  context: MapboxFeatureContext[] | undefined,
  prefixes: string[]
): string {
  if (!context || context.length === 0) return "";

  const match = context.find((entry) => {
    const id = (entry.id ?? "").toLowerCase();
    return prefixes.some((prefix) => id.startsWith(prefix));
  });

  return normalizeText(match?.text);
}

function mapFeatureToLocation(feature: MapboxFeature): MapboxLocation | null {
  const center = feature.center;
  if (!center || center.length !== 2) return null;

  const [lng, lat] = center;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const context = feature.context ?? [];
  const city =
    pickContextText(context, ["place", "locality", "district"]) ||
    normalizeText(feature.text);
  const area =
    pickContextText(context, ["neighborhood", "address", "postcode"]) ||
    normalizeText(feature.text);
  const address = normalizeText(feature.place_name) || `${lat}, ${lng}`;

  return {
    lng,
    lat,
    address,
    city,
    area,
  };
}

async function callGeocodingApi(url: string): Promise<MapboxLocation | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const json = (await response.json()) as MapboxGeocodingResponse;
  const topFeature = json.features?.[0];
  if (!topFeature) return null;

  return mapFeatureToLocation(topFeature);
}

export async function mapboxForwardGeocode(
  token: string,
  query: string
): Promise<MapboxLocation | null> {
  const normalizedQuery = query.trim();
  if (!token || !normalizedQuery) return null;

  const url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    `${encodeURIComponent(normalizedQuery)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    "&limit=1&language=en";

  return callGeocodingApi(url);
}

export async function mapboxReverseGeocode(
  token: string,
  lng: number,
  lat: number
): Promise<MapboxLocation | null> {
  if (!token || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const coordinates = `${lng},${lat}`;
  const url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    `${encodeURIComponent(coordinates)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    "&limit=1&language=en";

  return callGeocodingApi(url);
}
