import { and, eq, sql } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { vendorMedia, vendorPackages, vendors } from "@kritva/db";
import type { VendorReadinessResponse } from "@kritva/types";

export async function computeVendorReadiness(
  vendorId: string,
): Promise<VendorReadinessResponse> {
  const [vendor] = await db
    .select({
      category: vendors.category,
      profilePhotoUrl: vendors.profilePhotoUrl,
    })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  const categoryOk = (vendor?.category.length ?? 0) >= 1;
  const profilePhotoOk = Boolean(vendor?.profilePhotoUrl?.trim());

  const [packageRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorPackages)
    .where(
      and(
        eq(vendorPackages.vendorId, vendorId),
        eq(vendorPackages.isActive, true),
      ),
    );

  const packagesOk = (packageRow?.count ?? 0) >= 1;

  const [mediaRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorMedia)
    .where(
      and(
        eq(vendorMedia.vendorId, vendorId),
        eq(vendorMedia.section, "portfolio"),
      ),
    );

  const portfolioOk = (mediaRow?.count ?? 0) >= 5;

  const missing: string[] = [];
  if (!categoryOk) missing.push("Add at least one category");
  if (!packagesOk) missing.push("Add at least one active package");
  if (!portfolioOk) missing.push("Upload at least 5 portfolio photos");
  if (!profilePhotoOk) missing.push("Upload a profile photo");

  return {
    complete: categoryOk && packagesOk && portfolioOk && profilePhotoOk,
    checks: {
      category: categoryOk,
      packages: packagesOk,
      portfolio: portfolioOk,
      profile_photo: profilePhotoOk,
    },
    missing,
  };
}
