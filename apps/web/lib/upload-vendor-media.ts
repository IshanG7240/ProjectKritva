import { supabase } from "@/lib/supabase";

export type VendorMediaBucket = "portfolio" | "banners" | "pfp";

const BUCKET_NAMES: Record<VendorMediaBucket, string> = {
  portfolio:
    process.env.NEXT_PUBLIC_SUPABASE_PORTFOLIO_BUCKET ?? "portfolio",
  banners: process.env.NEXT_PUBLIC_SUPABASE_BANNERS_BUCKET ?? "banners",
  pfp: process.env.NEXT_PUBLIC_SUPABASE_PFP_BUCKET ?? "pfp",
};

const MAX_BYTES: Record<VendorMediaBucket, number> = {
  portfolio: 10 * 1024 * 1024,
  banners: 10 * 1024 * 1024,
  pfp: 2 * 1024 * 1024,
};

const ACCEPTED_PREFIXES: Record<VendorMediaBucket, string[]> = {
  portfolio: ["image/", "video/"],
  banners: ["image/"],
  pfp: ["image/"],
};

function formatMaxSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${bytes / (1024 * 1024)} MB`
    : `${bytes / 1024} KB`;
}

function validateFile(file: File, bucket: VendorMediaBucket): void {
  const maxBytes = MAX_BYTES[bucket];
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large. Maximum size for ${bucket} uploads is ${formatMaxSize(maxBytes)}.`,
    );
  }

  const accepted = ACCEPTED_PREFIXES[bucket];
  if (!accepted.some((prefix) => file.type.startsWith(prefix))) {
    throw new Error(
      bucket === "portfolio"
        ? "Upload an image or video file."
        : "Upload an image file.",
    );
  }
}

export async function uploadVendorMediaFile(
  file: File,
  vendorId: string,
  bucket: VendorMediaBucket,
): Promise<string> {
  validateFile(file, bucket);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path =
    bucket === "pfp"
      ? `${vendorId}/avatar.${ext}`
      : `${vendorId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_NAMES[bucket]).upload(
    path,
    file,
    {
      cacheControl: "3600",
      upsert: bucket === "pfp",
      contentType: file.type || undefined,
    },
  );

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? `Storage bucket "${BUCKET_NAMES[bucket]}" is not configured yet.`
        : error.message,
    );
  }

  const { data } = supabase.storage
    .from(BUCKET_NAMES[bucket])
    .getPublicUrl(path);

  return `${data.publicUrl}?t=${Date.now()}`;
}
