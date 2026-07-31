import { sendEmail } from "./email.js";

export type BookingVendorAcceptedPayload = {
  kind: "booking_vendor_accepted";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  to_email: string | null;
  booking_url: string;
  vendor_business_name?: string | null;
};

export type BookingInquiryCreatedPayload = {
  kind: "booking_inquiry_created";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  event_date: string;
  event_type: string;
  total_amount: number;
  to_email: string | null;
  booking_url: string;
  customer_name?: string | null;
};

export type BookingPaymentHeldPayload = {
  kind: "booking_payment_held";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  to_email: string | null;
  booking_url: string;
  /** customer | vendor — copy differs slightly. */
  recipient_role: "customer" | "vendor";
  counterparty_name?: string | null;
};

export type BookingCompletedPayload = {
  kind: "booking_completed";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  to_email: string | null;
  booking_url: string;
  gallery_url?: string | null;
  vendor_business_name?: string | null;
};

export type BookingDisputedPayload = {
  kind: "booking_disputed";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  to_email: string | null;
  booking_url: string;
  reason: string;
  description: string;
  recipient_role: "customer" | "vendor";
};

export type BookingReleasedPayload = {
  kind: "booking_released";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  amount_transferred?: number | null;
  to_email: string | null;
  booking_url: string;
  recipient_role: "customer" | "vendor";
  vendor_business_name?: string | null;
};

export type BookingResolvedPayload = {
  kind: "booking_resolved";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  outcome: "released" | "refunded" | "split";
  reason: string;
  to_email: string | null;
  booking_url: string;
  recipient_role: "customer" | "vendor";
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
  | BookingInquiryCreatedPayload
  | BookingPaymentHeldPayload
  | BookingCompletedPayload
  | BookingDisputedPayload
  | BookingReleasedPayload
  | BookingResolvedPayload
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

/** Format paisa as ₹ for email render only (integer math). */
function formatInr(paisa: number): string {
  const sign = paisa < 0 ? "-" : "";
  const abs = Math.abs(paisa);
  const rupees = Math.trunc(abs / 100);
  const paise = abs % 100;
  return `${sign}₹${rupees.toLocaleString("en-IN")}.${String(paise).padStart(2, "0")}`;
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

function bookingVendorAcceptedHtml(
  bookingUrl: string,
  totalAmount: number,
  vendorBusinessName: string | null | undefined,
): string {
  const url = escapeHtml(bookingUrl);
  const amount = escapeHtml(formatInr(totalAmount));
  const vendorLine = vendorBusinessName
    ? `<p><strong>${escapeHtml(vendorBusinessName)}</strong> has accepted your booking inquiry.</p>`
    : `<p>Your photographer has accepted your booking inquiry.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  ${vendorLine}
  <p>Total: <strong>${amount}</strong>. You can pay securely through Kritva to confirm the booking.</p>
  <p><a href="${url}">View booking and pay</a></p>
</body>
</html>`;
}

function bookingInquiryCreatedHtml(
  bookingUrl: string,
  eventDate: string,
  eventType: string,
  totalAmount: number,
  customerName: string | null | undefined,
): string {
  const url = escapeHtml(bookingUrl);
  const amount = escapeHtml(formatInr(totalAmount));
  const who = customerName
    ? escapeHtml(customerName)
    : "A customer";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>${who} sent you a new booking inquiry.</p>
  <p><strong>Event:</strong> ${escapeHtml(eventType)} on ${escapeHtml(eventDate)}</p>
  <p><strong>Quoted total:</strong> ${amount}</p>
  <p><a href="${url}">Review this lead</a></p>
</body>
</html>`;
}

function bookingPaymentHeldHtml(
  bookingUrl: string,
  totalAmount: number,
  recipientRole: "customer" | "vendor",
  counterpartyName: string | null | undefined,
): string {
  const url = escapeHtml(bookingUrl);
  const amount = escapeHtml(formatInr(totalAmount));
  const who = counterpartyName ? escapeHtml(counterpartyName) : null;

  if (recipientRole === "vendor") {
    return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>${who ? `${who} has paid` : "Payment received"} — <strong>${amount}</strong> is held safely until the job is done.</p>
  <p><a href="${url}">View booking</a></p>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>Paid — held safely until the job is done. Amount: <strong>${amount}</strong>.</p>
  <p>${who ? `Your photographer (${who}) can now see your contact details.` : "Your photographer can now see your contact details."}</p>
  <p><a href="${url}">View booking</a></p>
</body>
</html>`;
}

function bookingCompletedHtml(
  bookingUrl: string,
  totalAmount: number,
  galleryUrl: string | null | undefined,
  vendorBusinessName: string | null | undefined,
): string {
  const url = escapeHtml(bookingUrl);
  const amount = escapeHtml(formatInr(totalAmount));
  const vendor = vendorBusinessName
    ? escapeHtml(vendorBusinessName)
    : "Your photographer";
  const gallery = galleryUrl
    ? `<p><a href="${escapeHtml(galleryUrl)}">Open delivery gallery</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p><strong>${vendor}</strong> marked your booking as delivered.</p>
  <p>Please review the work, then release <strong>${amount}</strong> — or tell us if something's wrong.</p>
  ${gallery}
  <p><a href="${url}">Review and release</a></p>
</body>
</html>`;
}

function bookingDisputedHtml(
  bookingUrl: string,
  reason: string,
  description: string,
  recipientRole: "customer" | "vendor",
): string {
  const url = escapeHtml(bookingUrl);
  const reasonLabel = escapeHtml(reason.replaceAll("_", " "));
  const desc = escapeHtml(description).replaceAll("\n", "<br>");

  const intro =
    recipientRole === "customer"
      ? "We've put this booking on hold while we look into it. Payment stays held."
      : "A customer flagged a problem with this booking. Payment stays held until it's resolved.";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>${intro}</p>
  <p><strong>Reason:</strong> ${reasonLabel}</p>
  <p>${desc}</p>
  <p><a href="${url}">View booking</a></p>
</body>
</html>`;
}

function bookingReleasedHtml(
  bookingUrl: string,
  totalAmount: number,
  amountTransferred: number | null | undefined,
  recipientRole: "customer" | "vendor",
  vendorBusinessName: string | null | undefined,
): string {
  const url = escapeHtml(bookingUrl);
  const amount = escapeHtml(formatInr(totalAmount));
  const payout =
    amountTransferred != null
      ? escapeHtml(formatInr(amountTransferred))
      : null;
  const vendor = vendorBusinessName
    ? escapeHtml(vendorBusinessName)
    : "your photographer";

  if (recipientRole === "vendor") {
    return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>Funds have been released for your booking.</p>
  <p>${payout ? `Payout amount: <strong>${payout}</strong> (after Kritva commission).` : `Booking total: <strong>${amount}</strong>.`}</p>
  <p><a href="${url}">View booking</a></p>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>You've released payment to <strong>${vendor}</strong>.</p>
  <p>Amount: <strong>${amount}</strong>.</p>
  <p><a href="${url}">View booking</a></p>
</body>
</html>`;
}

function bookingResolvedHtml(
  bookingUrl: string,
  outcome: "released" | "refunded" | "split",
  reason: string,
): string {
  const url = escapeHtml(bookingUrl);
  const outcomeLabel =
    outcome === "released"
      ? "released to the photographer"
      : outcome === "refunded"
        ? "refunded to you / the customer"
        : "split between both parties";

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; line-height: 1.5; color: #111;">
  <p>Hi,</p>
  <p>We've resolved the hold on this booking — funds are being <strong>${outcomeLabel}</strong>.</p>
  <p><strong>Reason:</strong> ${escapeHtml(reason).replaceAll("\n", "<br>")}</p>
  <p><a href="${url}">View booking</a></p>
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

    case "booking_vendor_accepted": {
      if (!payload.to_email) return;

      const vendorLabel = payload.vendor_business_name?.trim() || "your photographer";
      await sendEmail({
        to: payload.to_email,
        subject: `${vendorLabel} accepted your booking — pay to confirm`,
        html: bookingVendorAcceptedHtml(
          payload.booking_url,
          payload.total_amount,
          payload.vendor_business_name,
        ),
      });
      return;
    }

    case "booking_inquiry_created": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject: `New booking inquiry — ${payload.event_type} on ${payload.event_date}`,
        html: bookingInquiryCreatedHtml(
          payload.booking_url,
          payload.event_date,
          payload.event_type,
          payload.total_amount,
          payload.customer_name,
        ),
      });
      return;
    }

    case "booking_payment_held": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject:
          payload.recipient_role === "vendor"
            ? `Paid and held — ${formatInr(payload.total_amount)}`
            : "Paid — held safely until the job is done",
        html: bookingPaymentHeldHtml(
          payload.booking_url,
          payload.total_amount,
          payload.recipient_role,
          payload.counterparty_name,
        ),
      });
      return;
    }

    case "booking_completed": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject: "Delivered — review and release payment",
        html: bookingCompletedHtml(
          payload.booking_url,
          payload.total_amount,
          payload.gallery_url,
          payload.vendor_business_name,
        ),
      });
      return;
    }

    case "booking_disputed": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject: "On hold — we're looking into it",
        html: bookingDisputedHtml(
          payload.booking_url,
          payload.reason,
          payload.description,
          payload.recipient_role,
        ),
      });
      return;
    }

    case "booking_released": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject:
          payload.recipient_role === "vendor"
            ? "Funds released to you"
            : "Payment released",
        html: bookingReleasedHtml(
          payload.booking_url,
          payload.total_amount,
          payload.amount_transferred,
          payload.recipient_role,
          payload.vendor_business_name,
        ),
      });
      return;
    }

    case "booking_resolved": {
      if (!payload.to_email) return;

      await sendEmail({
        to: payload.to_email,
        subject: `Booking hold resolved — ${payload.outcome}`,
        html: bookingResolvedHtml(
          payload.booking_url,
          payload.outcome,
          payload.reason,
        ),
      });
      return;
    }
  }
}
