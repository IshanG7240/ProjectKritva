"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { VendorMedia, VendorProfile, VendorService } from "@/lib/vendor-profile";

export type VendorProfileDraft = VendorProfile;

function draftStorageKey(vendorId: string) {
  return `kritva-vendor-draft:${vendorId}`;
}

function createLocalId(prefix: "service" | "media") {
  return `local-${prefix}-${crypto.randomUUID()}`;
}

function cloneProfile(profile: VendorProfile): VendorProfileDraft {
  return structuredClone(profile);
}

function profilesEqual(a: VendorProfileDraft, b: VendorProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Fields managed server-side — always taken from the latest API response. */
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
  };
}

async function fetchMyVendorProfile(): Promise<VendorProfile> {
  const res = await apiClient.get<{ vendor: VendorProfile }>("/v1/vendors/me");
  if (res.error) throw new Error(res.error.message);
  return res.data!.vendor;
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

      const stored = localStorage.getItem(draftStorageKey(profile.id));
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as VendorProfileDraft;
          if (parsed.id === profile.id) {
            setDraft(applyServerFields(parsed, profile));
            setLoading(false);
            return;
          }
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
        >
      >,
    ) => {
      updateDraft((current) => ({ ...current, ...patch }));
    },
    [updateDraft],
  );

  const updateService = useCallback(
    (serviceId: string, patch: Partial<VendorService>) => {
      updateDraft((current) => ({
        ...current,
        services: current.services.map((service) =>
          service.id === serviceId ? { ...service, ...patch } : service,
        ),
      }));
    },
    [updateDraft],
  );

  const addService = useCallback(() => {
    updateDraft((current) => ({
      ...current,
      services: [
        ...current.services,
        {
          id: createLocalId("service"),
          name: "New service",
          description: "",
          price_min: 0,
          price_max: 0,
          unit: "per_event",
          is_active: true,
        },
      ],
    }));
  }, [updateDraft]);

  const removeService = useCallback(
    (serviceId: string) => {
      updateDraft((current) => ({
        ...current,
        services: current.services.filter((service) => service.id !== serviceId),
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

      if (Object.keys(profilePatch).length > 0) {
        const res = await apiClient.patch("/v1/vendors/me", profilePatch);
        if (res.error) throw new Error(res.error.message);
      }

      const savedServices = saved.services.filter((s) => s.is_active !== false);
      const draftServices = draft.services.filter((s) => s.is_active !== false);
      const draftServiceIds = new Set(draftServices.map((s) => s.id));

      for (const service of savedServices) {
        if (!draftServiceIds.has(service.id)) {
          const res = await apiClient.delete(
            `/v1/vendors/me/services/${service.id}`,
          );
          if (res.error) throw new Error(res.error.message);
        }
      }

      const idMap = new Map<string, string>();

      for (const service of draftServices) {
        const savedService = savedServices.find((s) => s.id === service.id);

        if (service.id.startsWith("local-")) {
          const res = await apiClient.post<{ service: { id: string } }>(
            "/v1/vendors/me/services",
            {
              name: service.name,
              description: service.description ?? "",
              price_min: service.price_min,
              price_max: service.price_max,
              unit: service.unit,
              is_active: true,
            },
          );
          if (res.error || !res.data) {
            throw new Error(res.error?.message ?? "Failed to create service.");
          }
          idMap.set(service.id, res.data.service.id);
          continue;
        }

        if (
          !savedService ||
          savedService.name !== service.name ||
          (savedService.description ?? "") !== (service.description ?? "") ||
          savedService.price_min !== service.price_min ||
          savedService.price_max !== service.price_max ||
          savedService.unit !== service.unit
        ) {
          const res = await apiClient.patch(
            `/v1/vendors/me/services/${service.id}`,
            {
              name: service.name,
              description: service.description ?? "",
              price_min: service.price_min,
              price_max: service.price_max,
              unit: service.unit,
              is_active: true,
            },
          );
          if (res.error) throw new Error(res.error.message);
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
          idMap.set(item.id, res.data.media.id);
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
    updateService,
    addService,
    removeService,
    addMedia,
    removeMedia,
    updateMediaAlt,
  };
}
