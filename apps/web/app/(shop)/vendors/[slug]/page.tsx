"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { VendorProfileLayout } from "@/components/vendor/profile/VendorProfileLayout";
import {
  HeroGallery,
  type VendorMediaItem,
} from "@/components/vendor/profile/HeroGallery";
import { VendorHeader } from "@/components/vendor/profile/VendorHeader";
import { PortfolioShowcase } from "@/components/vendor/profile/PortfolioShowcase";
import { AboutSection } from "@/components/vendor/profile/AboutSection";
import { LocationSection } from "@/components/vendor/profile/LocationSection";
import { PublicPackagesList } from "@/components/vendor/profile/PackagesSection";
import { VendorProfileSidebar } from "@/components/vendor/profile/VendorProfileSidebar";
import { VendorRatingSection } from "@/components/vendor/profile/VendorRatingSection";
import { StickyActionBar } from "@/components/vendor/profile/StickyActionBar";
import { formatInr } from "@/lib/booking-form";
import type { VendorPackage } from "@/lib/vendor-profile";

interface VendorProfile {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  years_in_business: number | null;
  profile_photo_url: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_maps_url: string | null;
  avg_rating: number | null;
  rating_count: number;
  booking_count: number;
  response_time_hours: number | null;
  is_verified: boolean;
  is_mock: boolean;
  packages: VendorPackage[];
  media: VendorMediaItem[];
}

interface VendorResponse {
  vendor: VendorProfile;
}

async function fetchVendor(slug: string): Promise<VendorProfile> {
  const res = await apiClient.get<VendorResponse>(`/v1/vendors/${slug}`);
  if (res.error) throw new Error(res.error.message);
  return res.data!.vendor;
}

function formatVendorLocation(
  cityId: string,
  locationName?: string | null,
): string {
  const place = locationName?.trim();
  if (place) return place;
  return cityId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function computeFromPrice(packages: VendorPackage[]): string | null {
  const active = packages.filter((p) => p.is_active !== false && p.price > 0);
  if (active.length === 0) return null;
  const min = Math.min(...active.map((p) => p.price));
  return `From ${formatInr(min)}`;
}

export default function VendorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const {
    data: vendor,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => fetchVendor(slug),
  });

  if (isLoading) {
    return (
      <VendorProfileLayout
        hero={
          <div className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8">
            <div className="aspect-[3/2] animate-pulse rounded-lg bg-mk-line" />
          </div>
        }
        main={<div className="h-40 animate-pulse rounded-lg bg-mk-line" />}
        sidebar={<VendorProfileSidebar />}
      />
    );
  }

  if (isError || !vendor) {
    return (
      <VendorProfileLayout
        main={
          <p className="text-body text-danger">
            {error instanceof Error ? error.message : "Couldn't load profile"}
          </p>
        }
        sidebar={<VendorProfileSidebar />}
      />
    );
  }

  const bannerMedia = vendor.media.filter(
    (item) => (item.section ?? "portfolio") === "banner",
  );
  const portfolioMedia = vendor.media.filter(
    (item) => (item.section ?? "portfolio") === "portfolio",
  );
  const hasRatings = vendor.rating_count > 0 && vendor.avg_rating != null;
  const fromLabel = computeFromPrice(vendor.packages);

  return (
    <VendorProfileLayout
      hero={
        <div>
          <HeroGallery media={bannerMedia} />
          <div className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8">
            <VendorHeader
              businessName={vendor.business_name}
              categories={vendor.category}
              cityId={vendor.city_id}
              location={formatVendorLocation(
                vendor.city_id,
                vendor.location_name,
              )}
              yearsInBusiness={vendor.years_in_business}
              avgRating={vendor.avg_rating}
              ratingCount={vendor.rating_count}
              avatarUrl={vendor.profile_photo_url}
              isVerified={vendor.is_verified}
              isMock={vendor.is_mock}
            />
            {fromLabel ? (
              <p className="mt-3 text-money text-mk-ink lg:hidden">
                {fromLabel}
              </p>
            ) : null}
          </div>
        </div>
      }
      main={
        <>
          {vendor.packages.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-heading text-mk-ink">Packages</h2>
              <PublicPackagesList packages={vendor.packages} />
            </section>
          ) : null}

          {portfolioMedia.length > 0 ? (
            <PortfolioShowcase
              media={portfolioMedia}
              vendorSlug={vendor.slug}
            />
          ) : null}

          <AboutSection description={vendor.description} />

          <LocationSection
            location={{
              location_name: vendor.location_name ?? null,
              location_address: vendor.location_address ?? null,
              location_lat: vendor.location_lat ?? null,
              location_lng: vendor.location_lng ?? null,
              location_maps_url: vendor.location_maps_url ?? null,
            }}
          />
        </>
      }
      sidebar={
        <VendorProfileSidebar
          vendorId={vendor.id}
          vendorSlug={vendor.slug}
          packages={vendor.packages}
        />
      }
      bottom={
        hasRatings ? (
          <VendorRatingSection
            avgRating={vendor.avg_rating}
            ratingCount={vendor.rating_count}
          />
        ) : null
      }
      stickyBar={<StickyActionBar priceLabel={fromLabel} />}
    />
  );
}
