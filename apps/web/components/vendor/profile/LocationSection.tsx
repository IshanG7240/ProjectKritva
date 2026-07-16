"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import {
  hasVendorLocation,
  mapsEmbedUrl,
  mapsOpenUrl,
  parseGoogleMapsUrl,
} from "@/lib/google-maps-location";

export interface VendorLocationValue {
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_maps_url: string | null;
}

interface LocationSectionProps {
  location: VendorLocationValue;
  editable?: boolean;
  onLocationChange?: (location: VendorLocationValue) => void;
}

const EMPTY_LOCATION: VendorLocationValue = {
  location_name: null,
  location_address: null,
  location_lat: null,
  location_lng: null,
  location_maps_url: null,
};

export function LocationSection({
  location,
  editable = false,
  onLocationChange,
}: LocationSectionProps) {
  const [mapsUrlInput, setMapsUrlInput] = useState(
    location.location_maps_url ?? "",
  );
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setMapsUrlInput(location.location_maps_url ?? "");
  }, [location.location_maps_url]);

  const hasLocation = hasVendorLocation(location);

  function applyMapsUrl(raw: string) {
    setMapsUrlInput(raw);
    setParseError(null);

    const trimmed = raw.trim();
    if (!trimmed) {
      onLocationChange?.(EMPTY_LOCATION);
      return;
    }

    if (
      trimmed.includes("maps.app.goo.gl") ||
      trimmed.includes("goo.gl/maps")
    ) {
      setParseError(
        "Short links aren't supported. Open the place in Google Maps, then copy the full URL from the address bar.",
      );
      return;
    }

    const parsed = parseGoogleMapsUrl(trimmed);
    if (!parsed) {
      setParseError(
        "Couldn't read a pin from that link. Paste a Google Maps place or pin URL.",
      );
      return;
    }

    onLocationChange?.({
      location_name: location.location_name ?? parsed.name,
      location_address: location.location_address,
      location_lat: parsed.lat,
      location_lng: parsed.lng,
      location_maps_url: trimmed,
    });
  }

  if (!editable && !hasLocation) {
    return null;
  }

  if (editable && onLocationChange) {
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-lg font-semibold text-mk-ink">
              Studio / venue location{" "}
              <span className="font-normal text-mk-muted">(optional)</span>
            </h2>
            <p className="mt-1 font-sans text-sm text-mk-muted">
              Paste a Google Maps link so clients can find your studio or venue.
              You can skip this and add it later.
            </p>
          </div>
          {hasLocation ? (
            <button
              type="button"
              onClick={() => {
                setMapsUrlInput("");
                setParseError(null);
                onLocationChange(EMPTY_LOCATION);
              }}
              className="inline-flex items-center gap-1.5 font-sans text-sm text-mk-muted hover:text-mk-ink"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Google Maps link
            </span>
            <input
              type="url"
              value={mapsUrlInput}
              onChange={(e) => applyMapsUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
              className="rounded-md border border-mk-border bg-white px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Location name
            </span>
            <input
              type="text"
              value={location.location_name ?? ""}
              onChange={(e) =>
                onLocationChange({
                  ...location,
                  location_name: e.target.value.trim() ? e.target.value : null,
                })
              }
              placeholder="e.g. Grand Farmhouse, Chattarpur"
              className="rounded-md border border-mk-border bg-white px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Address (optional)
            </span>
            <input
              type="text"
              value={location.location_address ?? ""}
              onChange={(e) =>
                onLocationChange({
                  ...location,
                  location_address: e.target.value.trim()
                    ? e.target.value
                    : null,
                })
              }
              placeholder="Street / area for clients"
              className="rounded-md border border-mk-border bg-white px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </label>

          {parseError ? (
            <p className="font-sans text-sm text-red-600">{parseError}</p>
          ) : null}
        </div>

        {hasLocation &&
          location.location_lat != null &&
          location.location_lng != null ? (
          <LocationPreview
            name={location.location_name}
            address={location.location_address}
            lat={location.location_lat}
            lng={location.location_lng}
            mapsUrl={location.location_maps_url}
          />
        ) : null}
      </section>
    );
  }

  if (
    !hasLocation ||
    location.location_lat == null ||
    location.location_lng == null
  ) {
    return null;
  }

  return (
    <section>
      <h2 className="font-sans text-lg font-semibold text-mk-ink">Location</h2>
      <LocationPreview
        name={location.location_name}
        address={location.location_address}
        lat={location.location_lat}
        lng={location.location_lng}
        mapsUrl={location.location_maps_url}
      />
    </section>
  );
}

function LocationPreview({
  name,
  address,
  lat,
  lng,
  mapsUrl,
}: {
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  mapsUrl: string | null;
}) {
  const openUrl = mapsOpenUrl(lat, lng, mapsUrl);
  const title = name?.trim() || address?.trim() || "View on Google Maps";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-mk-navy" />
          <div className="min-w-0">
            <p className="font-sans text-sm font-medium text-mk-ink">{title}</p>
            {name?.trim() && address?.trim() ? (
              <p className="mt-0.5 font-sans text-sm text-mk-muted">{address}</p>
            ) : null}
          </div>
        </div>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-mk-navy hover:underline"
        >
          Open in Maps
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-mk-border">
        <iframe
          title={`Map for ${title}`}
          src={mapsEmbedUrl(lat, lng)}
          className="h-56 w-full border-0 md:h-64"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
