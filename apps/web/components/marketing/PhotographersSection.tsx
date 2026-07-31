import Link from "next/link";
import type { VendorListItem } from "@kritva/types/vendor";

import { VendorCard } from "@/components/vendor/VendorCard";
import { shellWide } from "@/lib/shell";

type VendorsResponse = {
  data?: { vendors?: VendorListItem[] } | null;
  vendors?: VendorListItem[];
};

function resolveApiBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BASE_URL ?? null;
  if (!raw) return null;
  return raw.replace(/\/+$/, "").replace(/\/v1$/, "");
}

async function fetchTopPhotographers(): Promise<VendorListItem[]> {
  const base = resolveApiBase();
  if (!base) return [];

  try {
    const res = await fetch(
      `${base}/v1/vendors?category=photography&sort=best&limit=4`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as VendorsResponse;
    return json.data?.vendors ?? json.vendors ?? [];
  } catch {
    return [];
  }
}

export async function PhotographersSection() {
  const vendors = await fetchTopPhotographers();
  if (vendors.length === 0) return null;

  return (
    <section id="photographers" className="bg-mk-bg py-16">
      <div className={`${shellWide} px-6`}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-meta font-medium uppercase tracking-widest text-mk-muted">
              Live in Delhi NCR
            </p>
            <h2 className="text-display tracking-tight text-mk-ink">
              Photographers on Kritva
            </h2>
          </div>
          <Link
            href="/vendors"
            className="text-meta font-medium text-mk-navy underline-offset-4 hover:underline"
          >
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {vendors.slice(0, 4).map((vendor) => (
            <VendorCard
              key={vendor.id}
              id={vendor.id}
              business_name={vendor.business_name}
              slug={vendor.slug}
              category={vendor.category}
              avg_rating={vendor.avg_rating}
              rating_count={vendor.rating_count}
              booking_count={vendor.booking_count}
              city_id={vendor.city_id}
              price_min={vendor.price_min}
              unit={vendor.unit}
              profile_photo_url={vendor.profile_photo_url}
              cover_image={vendor.cover_image}
              is_verified={vendor.is_verified}
              is_mock={vendor.is_mock}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
