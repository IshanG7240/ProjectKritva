import { sql, type SQL } from "drizzle-orm";
import { vendors } from "@kritva/db";

/**
 * Public discovery eligibility:
 * - Admin-approved vendors are always listed
 * - Otherwise, checklist-complete vendors
 *   (category + package + portfolio + profile photo)
 *   appear without the Kritva Verified badge
 * - Rejected / suspended vendors stay hidden
 */
export function vendorDiscoverableWhere(): SQL {
  return sql`(
    ${vendors.verificationStatus} = 'approved'
    OR (
      ${vendors.verificationStatus} NOT IN ('rejected', 'suspended')
      AND cardinality(${vendors.category}) >= 1
      AND ${vendors.profilePhotoUrl} IS NOT NULL
      AND trim(${vendors.profilePhotoUrl}) <> ''
      AND EXISTS (
        SELECT 1 FROM vendor_packages vp
        WHERE vp.vendor_id = ${vendors.id}
          AND vp.is_active = true
      )
      AND (
        SELECT count(*)::int FROM vendor_media vm
        WHERE vm.vendor_id = ${vendors.id}
          AND vm.section = 'portfolio'
      ) >= 5
    )
  )`;
}

export function isKritvaVerified(status: string): boolean {
  return status === "approved";
}

/** Marketplace demo profiles seeded for product walkthroughs. */
const MOCK_VENDOR_SLUGS = new Set([
  "spice-route-caterers",
  "aperture-stories",
  "the-orchid-estate",
]);

export function isMockVendor(slug: string): boolean {
  return MOCK_VENDOR_SLUGS.has(slug);
}
