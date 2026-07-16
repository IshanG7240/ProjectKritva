"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  VendorMedia,
  VendorPackage,
  VendorProfile,
} from "@/lib/vendor-profile";
import { packageUnitAllowsMinQuantity, type PackageUnit } from "@kritva/types/enums";

export type VendorProfileDraft = VendorProfile;

/** Versioned key so stale service-shaped drafts cannot corrupt package saves. */
function draftStorageKey(vendorId: string) {
  return `kritva-vendor-draft-v2:${vendorId}`;
}

function createLocalId(prefix: "package" | "media") {
  return `local-${prefix}-${crypto.randomUUID()}`;
}

function cloneProfile(profile: VendorProfile): VendorProfileDraft {
  return structuredClone(profile);
}

function profilesEqual(a: VendorProfileDraft, b: VendorProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyServerFields(
  draft: VendorProfileDraft,
  server: VendorProfile,
): VendorProfileDraft {
  return {
    ...draft,
    slug: server.slug,
    avg_rating: server.avg_rating,
    rating_count: server.rating_count,
    booking_count: server.booking_count,
    response_time_hours: server.response_time_hours,
    verification_status: server.verification_status,
    verification_notes: server.verification_notes ?? null,
  };
}

function isPackageShapedDraft(value: unknown): value is VendorProfileDraft {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.packages) && !("services" in record);
}

async function fetchMyVendorProfile(): Promise<VendorProfile> {
  const res = await apiClient.get<{ vendor: VendorProfile }>("/v1/vendors/me");
  if (res.error) throw new Error(res.error.message);
  const vendor = res.data!.vendor;
  return {
    ...vendor,
    location_name: vendor.location_name ?? null,
    location_address: vendor.location_address ?? null,
    location_lat: vendor.location_lat ?? null,
    location_lng: vendor.location_lng ?? null,
    location_maps_url: vendor.location_maps_url ?? null,
  };
}

function packagesEqual(a: VendorPackage, b: VendorPackage): boolean {
  return (
    a.name === b.name &&
    (a.description ?? "") === (b.description ?? "") &&
    a.price === b.price &&
    a.unit === b.unit &&
    (a.min_quantity ?? null) === (b.min_quantity ?? null) &&
    JSON.stringify(a.inclusions ?? []) === JSON.stringify(b.inclusions ?? []) &&
    (a.is_active !== false) === (b.is_active !== false)
  );
}

export function useVendorProfileDraft() {
  const [saved, setSaved] = useState<VendorProfileDraft | null>(null);
  const [draft, setDraft] = useState<VendorProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchMyVendorProfile();
      const baseline = cloneProfile(profile);
      setSaved(baseline);

      // Clear legacy v1 service drafts
      localStorage.removeItem(`kritva-vendor-draft:${profile.id}`);

      const stored = localStorage.getItem(draftStorageKey(profile.id));
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as unknown;
          if (
            isPackageShapedDraft(parsed) &&
            parsed.id === profile.id
          ) {
            setDraft(applyServerFields(parsed, profile));
            setLoading(false);
            return;
          }
          localStorage.removeItem(draftStorageKey(profile.id));
        } catch {
          localStorage.removeItem(draftStorageKey(profile.id));
        }
      }

      setDraft(baseline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!draft?.id) return;
    localStorage.setItem(draftStorageKey(draft.id), JSON.stringify(draft));
  }, [draft]);

  const isDirty = useMemo(() => {
    if (!saved || !draft) return false;
    return !profilesEqual(saved, draft);
  }, [saved, draft]);

  const updateDraft = useCallback(
    (updater: (current: VendorProfileDraft) => VendorProfileDraft) => {
      setDraft((current) => (current ? updater(current) : current));
    },
    [],
  );

  const updateProfile = useCallback(
    (
      patch: Partial<
        Pick<
          VendorProfileDraft,
          | "business_name"
          | "category"
          | "city_id"
          | "description"
          | "years_in_business"
          | "profile_photo_url"
          | "location_name"
          | "location_address"
          | "location_lat"
          | "location_lng"
          | "location_maps_url"
        >
      >,
    ) => {
      updateDraft((current) => ({ ...current, ...patch }));
    },
    [updateDraft],
  );

  const updatePackage = useCallback(
    (packageId: string, patch: Partial<VendorPackage>) => {
      updateDraft((current) => ({
        ...current,
        packages: current.packages.map((pkg) => {
          if (pkg.id !== packageId) return pkg;
          const next = { ...pkg, ...patch };
          if (patch.unit !== undefined && !packageUnitAllowsMinQuantity(patch.unit)) {
            next.min_quantity = null;
          }
          return next;
        }),
      }));
    },
    [updateDraft],
  );

  const addPackage = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      packages: [
        ...current.packages,
        {
          id: createLocalId("package"),
          name: "New package",
          description: "",
          price: 0,
          unit: "flat" as PackageUnit,
          min_quantity: null,
          inclusions: [],
          is_active: true,
        },
      ],
    }));
  }, [updateDraft]);

  const deactivatePackage = useCallback(
    (packageId: string) => {
      updateDraft((current) => ({
        ...current,
        packages: current.packages.map((pkg) =>
          pkg.id === packageId ? { ...pkg, is_active: false } : pkg,
        ),
      }));
    },
    [updateDraft],
  );

  const reactivatePackage = useCallback(
    (packageId: string) => {
      updateDraft((current) => ({
        ...current,
        packages: current.packages.map((pkg) =>
          pkg.id === packageId ? { ...pkg, is_active: true } : pkg,
        ),
      }));
    },
    [updateDraft],
  );

  const removeLocalPackage = useCallback(
    (packageId: string) => {
      if (!packageId.startsWith("local-")) return;
      updateDraft((current) => ({
        ...current,
        packages: current.packages.filter((pkg) => pkg.id !== packageId),
      }));
    },
    [updateDraft],
  );

  const addMedia = useCallback(
    (item: Omit<VendorMedia, "id">) => {
      updateDraft((current) => ({
        ...current,
        media: [
          ...current.media,
          {
            id: createLocalId("media"),
            ...item,
            section: item.section ?? "portfolio",
            position: current.media.filter(
              (mediaItem) =>
                (mediaItem.section ?? "portfolio") ===
                (item.section ?? "portfolio"),
            ).length,
          },
        ],
      }));
    },
    [updateDraft],
  );

  const removeMedia = useCallback(
    (mediaId: string) => {
      updateDraft((current) => ({
        ...current,
        media: current.media
          .filter((item) => item.id !== mediaId)
          .map((item, index) => ({ ...item, position: index })),
      }));
    },
    [updateDraft],
  );

  const updateMediaAlt = useCallback(
    (mediaId: string, alt_text: string) => {
      updateDraft((current) => ({
        ...current,
        media: current.media.map((item) =>
          item.id === mediaId ? { ...item, alt_text } : item,
        ),
      }));
    },
    [updateDraft],
  );

  const discardChanges = useCallback(() => {
    if (!saved) return;
    setDraft(cloneProfile(saved));
    localStorage.removeItem(draftStorageKey(saved.id));
  }, [saved]);

  const saveAll = useCallback(async () => {
    if (!saved || !draft) return;
    setSaving(true);
    setSaveError(null);

    try {
      const profilePatch: Record<string, unknown> = {};
      if (draft.business_name !== saved.business_name) {
        profilePatch.business_name = draft.business_name;
      }
      if (JSON.stringify(draft.category) !== JSON.stringify(saved.category)) {
        profilePatch.category = draft.category;
      }
      if (draft.city_id !== saved.city_id) {
        profilePatch.city_id = draft.city_id;
      }
      if ((draft.description ?? "") !== (saved.description ?? "")) {
        profilePatch.description = draft.description ?? "";
      }
      if (draft.years_in_business !== saved.years_in_business) {
        profilePatch.years_in_business = draft.years_in_business;
      }
      if (
        (draft.profile_photo_url ?? null) !== (saved.profile_photo_url ?? null)
      ) {
        profilePatch.profile_photo_url = draft.profile_photo_url ?? null;
      }
      if ((draft.location_name ?? null) !== (saved.location_name ?? null)) {
        profilePatch.location_name = draft.location_name ?? null;
      }
      if (
        (draft.location_address ?? null) !== (saved.location_address ?? null)
      ) {
        profilePatch.location_address = draft.location_address ?? null;
      }
      if ((draft.location_lat ?? null) !== (saved.location_lat ?? null)) {
        profilePatch.location_lat = draft.location_lat ?? null;
      }
      if ((draft.location_lng ?? null) !== (saved.location_lng ?? null)) {
        profilePatch.location_lng = draft.location_lng ?? null;
      }
      if (
        (draft.location_maps_url ?? null) !== (saved.location_maps_url ?? null)
      ) {
        profilePatch.location_maps_url = draft.location_maps_url ?? null;
      }

      if (Object.keys(profilePatch).length > 0) {
        const res = await apiClient.patch("/v1/vendors/me", profilePatch);
        if (res.error) throw new Error(res.error.message);
      }

      const draftById = new Map(draft.packages.map((pkg) => [pkg.id, pkg]));

      for (const savedPkg of saved.packages) {
        const draftPkg = draftById.get(savedPkg.id);
        if (!draftPkg) {
          if (savedPkg.is_active !== false) {
            const res = await apiClient.delete(
              `/v1/vendors/me/packages/${savedPkg.id}`,
            );
            if (res.error) throw new Error(res.error.message);
          }
          continue;
        }

        if (savedPkg.is_active !== false && draftPkg.is_active === false) {
          const res = await apiClient.delete(
            `/v1/vendors/me/packages/${savedPkg.id}`,
          );
          if (res.error) throw new Error(res.error.message);
          continue;
        }

        if (savedPkg.is_active === false && draftPkg.is_active !== false) {
          const res = await apiClient.patch(
            `/v1/vendors/me/packages/${savedPkg.id}`,
            {
              name: draftPkg.name,
              description: draftPkg.description ?? "",
              price: draftPkg.price,
              unit: draftPkg.unit,
              min_quantity: draftPkg.min_quantity,
              inclusions: draftPkg.inclusions ?? [],
              is_active: true,
            },
          );
          if (res.error) throw new Error(res.error.message);
          continue;
        }

        if (!packagesEqual(savedPkg, draftPkg)) {
          const res = await apiClient.patch(
            `/v1/vendors/me/packages/${savedPkg.id}`,
            {
              name: draftPkg.name,
              description: draftPkg.description ?? "",
              price: draftPkg.price,
              unit: draftPkg.unit,
              min_quantity: packageUnitAllowsMinQuantity(draftPkg.unit)
                ? draftPkg.min_quantity
                : null,
              inclusions: draftPkg.inclusions ?? [],
              is_active: draftPkg.is_active !== false,
            },
          );
          if (res.error) throw new Error(res.error.message);
        }
      }

      for (const draftPkg of draft.packages) {
        if (!draftPkg.id.startsWith("local-")) continue;
        if (draftPkg.is_active === false) continue;

        const res = await apiClient.post<{ package: { id: string } }>(
          "/v1/vendors/me/packages",
          {
            name: draftPkg.name,
            description: draftPkg.description ?? "",
            price: draftPkg.price,
            unit: draftPkg.unit,
            min_quantity: packageUnitAllowsMinQuantity(draftPkg.unit)
              ? draftPkg.min_quantity
              : null,
            inclusions: draftPkg.inclusions ?? [],
            is_active: true,
          },
        );
        if (res.error || !res.data) {
          throw new Error(res.error?.message ?? "Failed to create package.");
        }
      }

      const savedMedia = saved.media;
      const draftMedia = draft.media;
      const draftMediaIds = new Set(draftMedia.map((m) => m.id));

      for (const item of savedMedia) {
        if (!draftMediaIds.has(item.id)) {
          const res = await apiClient.delete(`/v1/vendors/me/media/${item.id}`);
          if (res.error) throw new Error(res.error.message);
        }
      }

      for (const item of draftMedia) {
        if (item.id.startsWith("local-")) {
          const mediaBody: Record<string, unknown> = {
            url: item.url,
            type: item.type,
            section: item.section ?? "portfolio",
            position: item.position,
          };
          if (item.thumbnail_url != null) {
            mediaBody.thumbnail_url = item.thumbnail_url;
          }
          if (item.detail_url != null) {
            mediaBody.detail_url = item.detail_url;
          }
          if (item.alt_text != null && item.alt_text !== "") {
            mediaBody.alt_text = item.alt_text;
          }

          const res = await apiClient.post<{ media: { id: string } }>(
            "/v1/vendors/me/media",
            mediaBody,
          );
          if (res.error || !res.data) {
            throw new Error(res.error?.message ?? "Failed to create media.");
          }
        }
      }

      const refreshed = await fetchMyVendorProfile();
      const next = cloneProfile(refreshed);
      setSaved(next);
      setDraft(next);
      localStorage.removeItem(draftStorageKey(refreshed.id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [saved, draft]);

  return {
    draft,
    saved,
    loading,
    saving,
    error,
    saveError,
    isDirty,
    load,
    saveAll,
    discardChanges,
    updateProfile,
    updatePackage,
    addPackage,
    deactivatePackage,
    reactivatePackage,
    removeLocalPackage,
    addMedia,
    removeMedia,
    updateMediaAlt,
  };
}
