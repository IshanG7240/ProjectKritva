import { sendEmail } from "./email.js";

export type BookingVendorAcceptedPayload = {
  kind: "booking_vendor_accepted";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
};

export type VendorSubmittedPayload = {
  kind: "vendor_submitted";
  vendor_id: string;
  user_id: string;
  business_name: string;
  slug?: string;
  to_email: string | null;
  profile_url: string;
};

export type VendorVerificationDecidedPayload = {
  kind: "vendor_verification_decided";
  vendor_id: string;
  user_id: string;
  business_name: string;
  slug: string;
  status: "approved" | "rejected";
  verification_notes: string | null;
  to_email: string | null;
  profile_url: string;
};

export type UserStatusChangedPayload = {
  kind: "user_status_changed";
  user_id: string;
  name: string;
  status: "active" | "suspended" | "banned";
  reason: string;
  suspended_until: string | null;
  to_email: string | null;
};

export type NotificationPayload =
  | BookingVendorAcceptedPayload
  | VendorSubmittedPayload
  | VendorVerificationDecidedPayload
  | UserStatusChangedPayload;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function vendorSubmittedHtml(
  businessName: string,
  profileUrl: string,
): string {
  const name = escapeHtml(businessName);
  const url = escapeHtml(profileUrl);

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>We received your vendor profile submission for <strong>${name}</strong>.</p>
  <p>Our team will review it and get back to you soon.</p>
  <p><a href="${url}">View your profile</a></p>
</body>
</html>`;
}

function vendorApprovedHtml(
  businessName: string,
  publicUrl: string,
): string {
  const name = escapeHtml(businessName);
  const url = escapeHtml(publicUrl);

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>Your vendor profile for <strong>${name}</strong> has been approved.</p>
  <p>Your public page is now live.</p>
  <p><a href="${url}">View your public page</a></p>
</body>
</html>`;
}

function userStatusChangedHtml(
  status: "suspended" | "banned" | "active",
  reason: string,
  suspendedUntil: string | null,
): string {
  const reasonBlock = reason
    ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
    : "";

  if (status === "active") {
    return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>Your account has been reinstated and now has full access again.</p>
  ${reasonBlock}
</body>
</html>`;
  }

  const headline =
    status === "banned"
      ? "Your account has been banned and can no longer be used."
      : suspendedUntil
        ? `Your account has been suspended until ${escapeHtml(suspendedUntil)}.`
        : "Your account has been suspended.";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>${headline}</p>
  ${reasonBlock}
  <p>If you believe this is a mistake, please contact support.</p>
</body>
</html>`;
}

function vendorRejectedHtml(
  businessName: string,
  notes: string | null,
  profileUrl: string,
): string {
  const name = escapeHtml(businessName);
  const url = escapeHtml(profileUrl);
  const notesBlock = notes
    ? `<p><strong>Notes from our team:</strong><br>${escapeHtml(notes).replaceAll("\n", "<br>")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>Your vendor profile for <strong>${name}</strong> was not approved at this time.</p>
  ${notesBlock}
  <p>Please review the feedback, update your profile, and submit again when ready.</p>
  <p><a href="${url}">Update your profile</a></p>
</body>
</html>`;
}

export async function dispatch(payload: NotificationPayload): Promise<void> {
  switch (payload.kind) {
    case "vendor_submitted": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject: `We received your vendor submission — ${payload.business_name}`,
        html: vendorSubmittedHtml(payload.business_name, payload.profile_url),
      });
      return;
    }

    case "vendor_verification_decided": {
      if (!payload.to_email) return;

      if (payload.status === "approved") {
        await sendEmail({
          to: payload.to_email,
          subject: `Your vendor profile is live — ${payload.business_name}`,
          html: vendorApprovedHtml(payload.business_name, payload.profile_url),
        });
        return;
      }

      await sendEmail({
        to: payload.to_email,
        subject: `Update needed on your vendor profile — ${payload.business_name}`,
        html: vendorRejectedHtml(
          payload.business_name,
          payload.verification_notes,
          payload.profile_url,
        ),
      });
      return;
    }

    case "user_status_changed": {
      if (!payload.to_email) return;

      const subject =
        payload.status === "banned"
          ? "Your Kritva account has been banned"
          : payload.status === "suspended"
            ? "Your Kritva account has been suspended"
            : "Your Kritva account has been reinstated";

      await sendEmail({
        to: payload.to_email,
        subject,
        html: userStatusChangedHtml(
          payload.status,
          payload.reason,
          payload.suspended_until,
        ),
      });
      return;
    }

    case "booking_vendor_accepted":
      return;
  }
}
