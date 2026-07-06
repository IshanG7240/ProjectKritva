"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { VendorProfileLayout } from "@/components/vendor/profile/VendorProfileLayout";
import { HeroGallery, type VendorMediaItem } from "@/components/vendor/profile/HeroGallery";
import { VendorHeader } from "@/components/vendor/profile/VendorHeader";
import { PortfolioShowcase } from "@/components/vendor/profile/PortfolioShowcase";
import { AboutSection } from "@/components/vendor/profile/AboutSection";
import { ServicesTable } from "@/components/vendor/profile/ServicesTable";
import { VendorProfileSidebar } from "@/components/vendor/profile/VendorProfileSidebar";
import { TestimonialsSection } from "@/components/vendor/profile/TestimonialsSection";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_min: number;
  price_max: number;
  unit: string;
}

interface VendorProfile {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  years_in_business: number | null;
  profile_photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
  booking_count: number;
  response_time_hours: number | null;
  services: Service[];
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

function formatVendorLocation(cityId: string): string {
  const cityLabel = cityId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${cityLabel}, Serving Pan-India`;
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
        vendorName="Loading..."
        hero={
          <div>
            <div className="mx-auto max-w-6xl px-6 pt-5">
              <div className="h-[320px] animate-pulse rounded-2xl border border-mk-border bg-[#EDE8DE] md:h-[420px]" />
            </div>
            <div className="mx-auto max-w-6xl px-6 pt-4">
              <div className="h-40 animate-pulse rounded-2xl bg-[#EDE8DE]" />
            </div>
          </div>
        }
        main={
          <div className="font-sans text-mk-muted">
            Loading vendor profile...
          </div>
        }
        sidebar={<VendorProfileSidebar />}
        bottom={<TestimonialsSection />}
      />
    );
  }

  if (isError) {
    return (
      <VendorProfileLayout
        vendorName="Vendor"
        main={
          <div className="text-red-600">
            Error loading vendor:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        }
        sidebar={<VendorProfileSidebar />}
        bottom={<TestimonialsSection />}
      />
    );
  }

  if (!vendor) return null;

  const bannerMedia = vendor.media.filter(
    (item) => (item.section ?? "portfolio") === "banner",
  );
  const portfolioMedia = vendor.media.filter(
    (item) => (item.section ?? "portfolio") === "portfolio",
  );

  return (
    <VendorProfileLayout
      vendorName={vendor.business_name}
      hero={
        <div>
          <HeroGallery media={bannerMedia} />
          <div className="mx-auto max-w-6xl px-6 pt-4">
            <VendorHeader
              businessName={vendor.business_name}
              categories={vendor.category}
              cityId={vendor.city_id}
              location={formatVendorLocation(vendor.city_id)}
              yearsInBusiness={vendor.years_in_business}
              avgRating={vendor.avg_rating}
              ratingCount={vendor.rating_count}
              avatarUrl={vendor.profile_photo_url}
            />
          </div>
        </div>
      }
      main={
        <div className="flex flex-col gap-8">
          <AboutSection
            businessName={vendor.business_name}
            description={vendor.description}
          />
          <ServicesTable services={vendor.services} />
          <PortfolioShowcase media={portfolioMedia} />
        </div>
      }
      sidebar={<VendorProfileSidebar />}
      bottom={<TestimonialsSection />}
    />
  );
}
