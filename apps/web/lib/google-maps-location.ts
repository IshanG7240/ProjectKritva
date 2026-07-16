export interface ParsedMapsLocation {
  lat: number;
  lng: number;
  name: string | null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function parseCoordPair(value: string): { lat: number; lng: number } | null {
  const match = value
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!isValidCoord(lat, lng)) return null;
  return { lat, lng };
}

function extractPlaceName(pathname: string): string | null {
  const match = pathname.match(/\/place\/([^/]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " ")).replace(/-/g, " ");
  } catch {
    return match[1].replace(/-/g, " ");
  }
}

/** Extract lat/lng (and optional place name) from a Google Maps URL. */
export function parseGoogleMapsUrl(raw: string): ParsedMapsLocation | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isGoogleMaps =
    host === "google.com" ||
    host === "maps.google.com" ||
    host.endsWith(".google.com") ||
    host === "maps.app.goo.gl" ||
    host === "goo.gl";
  if (!isGoogleMaps) return null;

  const name = extractPlaceName(url.pathname);

  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng, name };
  }

  const dMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dMatch) {
    const lat = Number(dMatch[1]);
    const lng = Number(dMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng, name };
  }

  for (const key of ["q", "query", "ll"]) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    const pair = parseCoordPair(value);
    if (pair) return { ...pair, name };
  }

  return null;
}

export function mapsEmbedUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    q: `${lat},${lng}`,
    z: "15",
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

export function mapsOpenUrl(
  lat: number,
  lng: number,
  mapsUrl?: string | null,
): string {
  if (mapsUrl?.trim()) return mapsUrl.trim();
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function hasVendorLocation(location: {
  location_lat?: number | null;
  location_lng?: number | null;
}): boolean {
  return location.location_lat != null && location.location_lng != null;
}
