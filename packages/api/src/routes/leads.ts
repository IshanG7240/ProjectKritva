/**
 * Public supply-gap leads from the vendor directory empty state.
 */

import { Hono } from "hono";
import { z } from "zod";
import { sendEmail } from "@kritva/notifications";

const supplyGapLeadSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  budget_rupees: z.string().max(20).optional(),
  requirement: z.string().trim().min(3).max(2000),
  contact_email: z.string().email().optional().or(z.literal("")),
});

export const leadsRouter = new Hono();

leadsRouter.post("/supply-gap", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = supplyGapLeadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "Invalid request",
        },
      },
      400,
    );
  }

  const { date, budget_rupees, requirement, contact_email } = parsed.data;
  const opsEmail =
    process.env.OPS_LEAD_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    null;

  const html = [
    "<p><strong>Supply gap lead from /vendors</strong></p>",
    `<p>Date: ${date || "(not specified)"}<br/>`,
    `Budget: ${budget_rupees ? `₹${budget_rupees}` : "(not specified)"}<br/>`,
    `Contact: ${contact_email || "(not provided)"}</p>`,
    `<p>${requirement.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`,
  ].join("");

  if (opsEmail) {
    await sendEmail({
      to: opsEmail,
      subject: "Kritva — photographer supply gap",
      html,
    }).catch(() => {});
  }

  console.info("[supply-gap-lead]", {
    date: date || null,
    budget_rupees: budget_rupees || null,
    has_contact: Boolean(contact_email),
    requirement_len: requirement.length,
  });

  return c.json({ data: { received: true }, error: null }, 200);
});
