"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useVendorProfileDraft } from "@/hooks/use-vendor-profile-draft";
import { uploadVendorMediaFile } from "@/lib/upload-vendor-media";
import { apiClient } from "@/lib/api-client";
import type { VendorReadinessResponse } from "@kritva/types";
import { ManageEditToolbar } from "@/components/vendor/edit/ManageEditToolbar";
import { VendorProfileLayout } from "@/components/vendor/profile/VendorProfileLayout";
import { VendorGoLivePanel } from "@/components/vendor/profile/VendorGoLivePanel";
import { HeroGallery, MAX_BANNER_PHOTOS } from "@/components/vendor/profile/HeroGallery";
import { VendorHeader } from "@/components/vendor/profile/VendorHeader";
import { AboutSection } from "@/components/vendor/profile/AboutSection";
import { LocationSection } from "@/components/vendor/profile/LocationSection";
import { PackagesSection } from "@/components/vendor/profile/PackagesSection";
import { PortfolioShowcase } from "@/components/vendor/profile/PortfolioShowcase";
import { VendorProfileSidebar } from "@/components/vendor/profile/VendorProfileSidebar";
import { TestimonialsSection } from "@/components/vendor/profile/TestimonialsSection";
import { VendorRatingSection } from "@/components/vendor/profile/VendorRatingSection";

async function fetchVendorReadiness(): Promise<VendorReadinessResponse> {
  const res = await apiClient.get<VendorReadinessResponse>(
    "/v1/vendors/me/readiness",
  );
  if (res.error) throw new Error(res.error.message);
  return res.data!;
}

async function submitVendorForReview() {
  const res = await apiClient.post<{
    id: string;
    verification_status: string;
    submitted_at: string;
  }>("/v1/vendors/me/submit", {});
  if (res.error) throw new Error(res.error.message);
  return res.data!;
}

function formatVendorLocation(cityId: string): string {
  const cityLabel = cityId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${cityLabel}, Serving Pan-India`;
}

function ManageSidebar() {
  return (
    <div className="rounded-xl border border-mk-border bg-[#FDFBF7] p-4">
      <p className="font-sans text-sm font-semibold text-mk-ink">
        Profile editing
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-mk-muted">
        Click any text to edit it. Upload photos for your gallery. Changes are
        saved locally as you type — use Save changes when you are ready to
        publish.
      </p>
    </div>
  );
}

function VendorProfileEditor() {
  const queryClient = useQueryClient();
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  const {
    draft,
    saved,
    loading,
    saving,
    error,
    saveError,
    isDirty,
    saveAll,
    discardChanges,
    load,
    updateProfile,
    updatePackage,
    addPackage,
    deactivatePackage,
    reactivatePackage,
    removeLocalPackage,
    addMedia,
    removeMedia,
  } = useVendorProfileDraft();

  const verificationStatus =
    saved?.verification_status ?? draft?.verification_status ?? "draft";

  const {
    data: readiness,
    isLoading: readinessLoading,
  } = useQuery({
    queryKey: ["vendor-readiness"],
    queryFn: fetchVendorReadiness,
    enabled: !loading && !!draft && verificationStatus !== "approved",
  });

  const submitMutation = useMutation({
    mutationFn: submitVendorForReview,
    onSuccess: async () => {
      await load();
      await queryClient.invalidateQueries({ queryKey: ["vendor-readiness"] });
      await queryClient.invalidateQueries({ queryKey: ["vendor-me-status"] });
      setSaveMessage("Profile submitted for review.");
    },
  });

  async function handleBannerUpload(files: File[]) {
    if (!draft) return;
    const bannerCount = draft.media.filter(
      (item) => item.section === "banner",
    ).length;
    const remaining = Math.max(0, MAX_BANNER_PHOTOS - bannerCount);
    if (remaining === 0) return;

    setUploadingBanner(true);
    try {
      for (const file of files.slice(0, remaining)) {
        const url = await uploadVendorMediaFile(file, draft.id, "banners");
        addMedia({
          url,
          thumbnail_url: null,
          detail_url: null,
          type: "image",
          section: "banner",
          position: draft.media.filter((item) => item.section === "banner").length,
          alt_text: null,
        });
      }
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handlePortfolioUpload(files: File[]) {
    if (!draft) return;
    setUploadingPortfolio(true);
    try {
      for (const file of files) {
        const url = await uploadVendorMediaFile(file, draft.id, "portfolio");
        const type = file.type.startsWith("video/") ? "video" : "image";
        addMedia({
          url,
          thumbnail_url: null,
          detail_url: null,
          type,
          section: "portfolio",
          position: draft.media.filter((item) => item.section === "portfolio")
            .length,
          alt_text: null,
        });
      }
    } finally {
      setUploadingPortfolio(false);
    }
  }

  async function handleProfilePhotoUpload(file: File) {
    if (!draft) return;
    setUploadingPfp(true);
    try {
      const url = await uploadVendorMediaFile(file, draft.id, "pfp");
      updateProfile({ profile_photo_url: url });
    } finally {
      setUploadingPfp(false);
    }
  }

  async function handleSave() {
    setSaveMessage(null);
    try {
      await saveAll();
      setSaveMessage("Profile saved successfully.");
      await queryClient.invalidateQueries({ queryKey: ["vendor-readiness"] });
    } catch {
      // saveError is set in hook
    }
  }

  if (loading || !draft) {
    return (
      <VendorProfileLayout
        vendorName="Loading..."
        toolbar={
          <div className="mt-14 border-b border-mk-border bg-[#FDFBF7] px-6 py-3">
            <p className="mx-auto max-w-6xl font-sans text-sm text-mk-muted">
              Loading profile…
            </p>
          </div>
        }
        hero={
          <div className="mx-auto max-w-6xl px-6 pt-5">
            <div className="h-[320px] animate-pulse rounded-2xl border border-mk-border bg-[#EDE8DE]" />
          </div>
        }
        main={<p className="font-sans text-mk-muted">Loading…</p>}
        sidebar={<ManageSidebar />}
      />
    );
  }

  if (error) {
    return (
      <VendorProfileLayout
        vendorName="Vendor"
        main={<p className="text-red-600">{error}</p>}
        sidebar={<ManageSidebar />}
      />
    );
  }

  const canPreview =
    verificationStatus === "approved" || readiness?.complete === true;
  const verificationNotes =
    saved?.verification_notes ?? draft.verification_notes ?? null;
  const bannerMedia = draft.media.filter(
    (item) => (item.section ?? "portfolio") === "banner",
  );
  const portfolioMedia = draft.media.filter(
    (item) => (item.section ?? "portfolio") === "portfolio",
  );

  return (
    <VendorProfileLayout
      vendorName={draft.business_name}
      toolbar={
        <>
          <ManageEditToolbar
            vendorSlug={draft.slug}
            isDirty={isDirty}
            saving={saving}
            canPreview={canPreview}
            isPreviewMode={isPreviewMode}
            onTogglePreview={() => setIsPreviewMode((current) => !current)}
            onSave={handleSave}
            onDiscard={discardChanges}
          />
          {(saveMessage || saveError) && (
            <div className="border-b border-mk-border bg-white px-6 py-2">
              <p
                className={`mx-auto max-w-6xl text-sm ${saveError ? "text-red-600" : "text-emerald-700"
                  }`}
              >
                {saveError ?? saveMessage}
              </p>
            </div>
          )}
          <VendorGoLivePanel
            verificationStatus={verificationStatus}
            verificationNotes={verificationNotes}
            readiness={readiness}
            readinessLoading={readinessLoading}
            isDirty={isDirty}
            isSubmitting={submitMutation.isPending}
            submitError={
              submitMutation.isError
                ? submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : "Submit failed"
                : null
            }
            onSubmit={() => submitMutation.mutate()}
          />
        </>
      }
      hero={
        <div>
          <HeroGallery
            media={bannerMedia}
            editable={!isPreviewMode}
            uploading={uploadingBanner}
            onUpload={handleBannerUpload}
            onRemove={removeMedia}
          />
          <div className="mx-auto max-w-6xl px-6 pt-4">
            <VendorHeader
              businessName={draft.business_name}
              categories={draft.category}
              cityId={draft.city_id}
              location={formatVendorLocation(draft.city_id)}
              yearsInBusiness={draft.years_in_business}
              avgRating={draft.avg_rating}
              ratingCount={draft.rating_count}
              avatarUrl={draft.profile_photo_url}
              isVerified={verificationStatus === "approved"}
              showPlaceholderRating={
                isPreviewMode &&
                (draft.avg_rating == null || draft.rating_count === 0)
              }
              editable={!isPreviewMode}
              uploadingAvatar={uploadingPfp}
              onAvatarUpload={handleProfilePhotoUpload}
              onBusinessNameChange={(business_name) =>
                updateProfile({ business_name })
              }
              onCategoriesChange={(category) => updateProfile({ category })}
              onCityIdChange={(city_id) => updateProfile({ city_id })}
              onYearsInBusinessChange={(years_in_business) =>
                updateProfile({ years_in_business })
              }
            />
          </div>
        </div>
      }
      main={
        <div className="flex flex-col gap-8">
          <AboutSection
            businessName={draft.business_name}
            description={draft.description}
            editable={!isPreviewMode}
            onDescriptionChange={(description) =>
              updateProfile({ description })
            }
          />
          <LocationSection
            location={{
              location_name: draft.location_name ?? null,
              location_address: draft.location_address ?? null,
              location_lat: draft.location_lat ?? null,
              location_lng: draft.location_lng ?? null,
              location_maps_url: draft.location_maps_url ?? null,
            }}
            editable={!isPreviewMode}
            onLocationChange={(location) => updateProfile(location)}
          />
          <PackagesSection
            packages={draft.packages}
            editable={!isPreviewMode}
            onPackageChange={updatePackage}
            onAddPackage={addPackage}
            onDeactivatePackage={deactivatePackage}
            onReactivatePackage={reactivatePackage}
            onRemoveLocalPackage={removeLocalPackage}
          />
          <PortfolioShowcase
            media={portfolioMedia}
            vendorSlug={draft.slug}
            editable={!isPreviewMode}
            uploading={uploadingPortfolio}
            onUpload={handlePortfolioUpload}
            onRemove={removeMedia}
          />
        </div>
      }
      sidebar={isPreviewMode ? <VendorProfileSidebar /> : <ManageSidebar />}
      bottom={
        isPreviewMode ? (
          <>
            <VendorRatingSection
              avgRating={draft.avg_rating}
              ratingCount={draft.rating_count}
              showPlaceholderRating={
                draft.avg_rating == null || draft.rating_count === 0
              }
            />
            <TestimonialsSection />
          </>
        ) : undefined
      }
    />
  );
}

export default function VendorProfilePage() {
  const { user, loading: authLoading } = useRequireAuth("vendor");

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mk-bg pt-14">
        <p className="font-sans text-sm text-mk-muted">Loading…</p>
      </main>
    );
  }

  return <VendorProfileEditor />;
}
