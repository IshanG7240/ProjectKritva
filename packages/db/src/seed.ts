/* eslint-disable */
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  users,
  vendors,
  vendorPackages,
  vendorMedia,
  vendorAvailability,
  vendorDocuments,
  events,
  checklistItems,
  bookings,
  bookingMilestones,
  bookingEvents,
  conversations,
  messages,
  notificationPreferences,
  disputes,
  auditLogs,
  reviews,
  payments,
  paymentPayouts,
  vendorBankAccounts
} from "./schema/index.js";

// Simple client-side ULID generator for deterministic seeding and reference building
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function generateUlid(): string {
  const now = Date.now();
  let timePart = "";
  let tempTime = now;
  for (let i = 0; i < 10; i++) {
    const mod = tempTime % 32;
    timePart = ENCODING[mod] + timePart;
    tempTime = Math.floor(tempTime / 32);
  }
  let randomPart = "";
  for (let i = 0; i < 16; i++) {
    const rand = Math.floor(Math.random() * 32);
    randomPart += ENCODING[rand];
  }
  return timePart + randomPart;
}

// Load env variables if not already present (failsafe for running script directly)
import * as fs from "fs";
import * as path from "path";

if (!process.env["DATABASE_URL"]) {
  try {
    let currentDir = process.cwd();
    while (currentDir) {
      const envPath = path.join(currentDir, ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        for (const line of envContent.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const index = trimmed.indexOf("=");
            if (index > 0) {
              const key = trimmed.substring(0, index).trim();
              let val = trimmed.substring(index + 1).trim();
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
              } else if (val.startsWith("'") && val.endsWith("'")) {
                val = val.substring(1, val.length - 1);
              }
              const commentIndex = val.indexOf("#");
              if (commentIndex >= 0) {
                val = val.substring(0, commentIndex).trim();
              }
              process.env[key] = val;
            }
          }
        }
        break;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  } catch (err) {
    console.warn("Could not load .env file:", err);
  }
}

async function main() {
  console.log("Starting database seeding...");

  // 1. Clean existing development data (skip platform_config to avoid losing migration seed)
  console.log("Truncating existing tables...");
  await db.execute(sql`
    TRUNCATE TABLE 
      users, otp_requests, refresh_tokens, device_tokens,
      vendors, vendor_services, vendor_media, vendor_availability, vendor_documents,
      events, checklist_items, bookings, booking_milestones, booking_events,
      payments, payment_payouts, vendor_bank_accounts, webhook_events, invoices,
      conversations, messages, notification_preferences, disputes, audit_logs, reviews
    CASCADE;
  `);

  // 2. Generate 5 Customer Users
  console.log("Creating 5 customer users...");
  const customerList = [
    { name: "Amit Sharma", phone: "+919876543210", email: "amit@example.com" },
    { name: "Priya Patel", phone: "+919876543211", email: "priya@example.com" },
    { name: "Rahul Verma", phone: "+919876543212", email: "rahul@example.com" },
    { name: "Neha Gupta", phone: "+919876543213", email: "neha@example.com" },
    { name: "Vikram Singh", phone: "+919876543214", email: "vikram@example.com" },
  ];

  const seededCustomers: any[] = [];
  for (const c of customerList) {
    const userId = generateUlid();
    await db.insert(users).values({
      id: userId,
      phone: c.phone,
      email: c.email,
      name: c.name,
      role: "customer",
      cityId: "delhi-ncr",
      status: "active",
      onboardingComplete: true,
      eventInterests: ["wedding", "birthday"],
    });
    seededCustomers.push({ id: userId, ...c });
  }

  // 3. Generate vendors (approved marketplace demos + go-live QA fixtures)
  console.log("Creating vendor users and profiles...");
  const vendorCategories = ["catering", "photography", "venue", "decor", "other"];
  const seededVendors: any[] = [];

  for (let i = 1; i <= 20; i++) {
    const userId = generateUlid();
    const vendorId = generateUlid();
    const category = vendorCategories[(i - 1) % vendorCategories.length]!;
    const phone = `+9199999999${i.toString().padStart(2, "0")}`;
    const email = `vendor${i}@example.com`;
    const businessName = `Vendor ${i} (${category.toUpperCase()})`;
    const slug = `vendor-${i}-${category}`;

    // Create User
    await db.insert(users).values({
      id: userId,
      phone,
      email,
      name: `Vendor Owner ${i}`,
      role: "vendor",
      cityId: "delhi-ncr",
      status: "active",
      onboardingComplete: true,
    });

    // Create Vendor Profile
    let verificationStatus:
      | "draft"
      | "pending_review"
      | "approved"
      | "rejected"
      | "suspended" = "approved";
    let submittedAt: Date | null = null;
    if (i === 18) {
      verificationStatus = "pending_review";
      submittedAt = new Date("2026-07-01T10:00:00Z");
    }
    if (i === 19) verificationStatus = "rejected";
    if (i === 20) verificationStatus = "suspended";

    await db.insert(vendors).values({
      id: vendorId,
      userId,
      businessName,
      slug,
      category: [category],
      cityId: "delhi-ncr",
      description: `Premium event ${category} services in Delhi NCR. Highly experienced.`,
      yearsInBusiness: 2 + (i % 8),
      avgRating: (4 + (i % 10) / 10).toFixed(2),
      ratingCount: 5 + (i * 2),
      bookingCount: 10 + i,
      responseTimeHours: (1.5 + (i % 5) / 2).toFixed(1),
      verificationStatus,
      submittedAt,
    });

    // Create Vendor Packages (2 per vendor)
    const package1Id = generateUlid();
    const package2Id = generateUlid();
    await db.insert(vendorPackages).values({
      id: package1Id,
      vendorId,
      name: `Standard ${category} Package`,
      description: `Comprehensive starter package for ${category} requirements.`,
      price: 5000000, // ₹50,000 in paisa
      unit: "flat",
      minQuantity: null,
      inclusions: ["Consultation", "Basic setup"],
      metadata: {},
      isActive: true,
    });
    await db.insert(vendorPackages).values({
      id: package2Id,
      vendorId,
      name: `Premium ${category} Package`,
      description: `Full-service premium package with dedicated resources.`,
      price: 12000000, // ₹1,20,000 in paisa
      unit: "flat",
      minQuantity: null,
      inclusions: ["Consultation", "Dedicated coordinator", "Premium setup"],
      metadata: {},
      isActive: true,
    });

    // Create Vendor Media (5 photos per vendor to meet platform SLA)
    for (let m = 1; m <= 5; m++) {
      await db.insert(vendorMedia).values({
        id: generateUlid(),
        vendorId,
        url: `https://images.unsplash.com/photo-${i}-${m}`,
        thumbnailUrl: `https://images.unsplash.com/photo-${i}-${m}-thumb`,
        detailUrl: `https://images.unsplash.com/photo-${i}-${m}-detail`,
        type: "image",
        position: m,
        altText: `${businessName} Portfolio Item ${m}`,
      });
    }

    // Create Vendor Availability (10 days availability)
    for (let d = 20; d < 30; d++) {
      await db.insert(vendorAvailability).values({
        id: generateUlid(),
        vendorId,
        date: `2026-06-${d}`,
        isAvailable: true,
      });
    }

    // Create Vendor Documents (PAN + GST)
    await db.insert(vendorDocuments).values({
      id: generateUlid(),
      vendorId,
      type: "pan",
      url: `https://r2.kritva.in/docs/vendor-${i}-pan.pdf`,
      fileName: `pan_card_vendor_${i}.pdf`,
      verified: verificationStatus === "approved",
      verifiedAt: verificationStatus === "approved" ? new Date() : null,
    });
    await db.insert(vendorDocuments).values({
      id: generateUlid(),
      vendorId,
      type: "gst_certificate",
      url: `https://r2.kritva.in/docs/vendor-${i}-gst.pdf`,
      fileName: `gst_cert_vendor_${i}.pdf`,
      verified: verificationStatus === "approved",
      verifiedAt: verificationStatus === "approved" ? new Date() : null,
    });

    // Create Bank Account
    await db.insert(vendorBankAccounts).values({
      id: generateUlid(),
      vendorId,
      accountNumberEnc: Buffer.from(`mock_encrypted_acc_${vendorId}`),
      ifscCode: "HDFC0001234",
      accountHolderName: `Vendor Account Holder ${i}`,
      lastFour: "1234",
      pennyDropStatus: "verified",
      verifiedAt: new Date(),
    });

    seededVendors.push({
      id: vendorId,
      userId,
      businessName,
      category,
      verificationStatus,
    });
  }

  // Draft incomplete vendor for go-live QA (missing category, services, portfolio)
  console.log("Creating draft incomplete vendor for QA...");
  const draftUserId = generateUlid();
  const draftVendorId = generateUlid();
  await db.insert(users).values({
    id: draftUserId,
    phone: "+919999999921",
    email: "vendor-draft-qa@example.com",
    name: "Draft QA Vendor Owner",
    role: "vendor",
    cityId: "delhi-ncr",
    status: "active",
    onboardingComplete: true,
  });
  await db.insert(vendors).values({
    id: draftVendorId,
    userId: draftUserId,
    businessName: "Draft QA Vendor (incomplete)",
    slug: "vendor-draft-qa-incomplete",
    category: [],
    cityId: "delhi-ncr",
    description: "Incomplete draft profile for go-live readiness QA.",
    verificationStatus: "draft",
  });
  await db.insert(vendorMedia).values({
    id: generateUlid(),
    vendorId: draftVendorId,
    url: "https://images.unsplash.com/photo-draft-qa-1",
    type: "image",
    section: "portfolio",
    position: 1,
    altText: "Draft QA placeholder",
  });
  seededVendors.push({
    id: draftVendorId,
    userId: draftUserId,
    businessName: "Draft QA Vendor (incomplete)",
    category: null,
    verificationStatus: "draft",
  });

  // 4. Create 10 Bookings in various states
  console.log("Creating 10 bookings in various states...");
  // We'll create events for customers first
  const seededEvents: any[] = [];
  for (let idx = 0; idx < 5; idx++) {
    const customer = seededCustomers[idx];
    const eventId = generateUlid();
    await db.insert(events).values({
      id: eventId,
      customerId: customer.id,
      name: `${customer.name}'s Wedding`,
      type: "wedding",
      date: `2026-06-25`,
      cityId: "delhi-ncr",
      venue: "Grand Farmhouse, Chattarpur",
      guestCount: 200,
      budgetTotal: 150000000, // ₹15,00,000 in paisa
      status: "in_progress",
    });
    seededEvents.push({ id: eventId, customerId: customer.id });
  }

  const bookingStates: Array<NonNullable<typeof bookings.$inferInsert["status"]>> = [
    "inquiry",
    "vendor_reviewing",
    "vendor_accepted",
    "vendor_declined",
    "vendor_countered",
    "customer_confirmed",
    "payment_pending",
    "payment_held",
    "in_progress",
    "completed",
  ];

  for (let idx = 0; idx < 10; idx++) {
    const status = bookingStates[idx]!;
    const customer = seededCustomers[idx % 5];
    const vendor = seededVendors[idx * 2]; // map to vendor 0, 2, 4, 6, 8, etc.
    const event = seededEvents[idx % 5];
    const bookingId = generateUlid();
    const eventDate = `2026-06-${20 + idx}`;

    const packageDetails = [
      {
        package_id: generateUlid(),
        name: `Standard ${vendor.category} Package`,
        quantity: 1,
        unit: "flat",
        price_at_booking: 5000000,
      },
    ];

    await db.insert(bookings).values({
      id: bookingId,
      eventId: event.id,
      vendorId: vendor.id,
      customerId: customer.id,
      packageDetails,
      totalAmount: 5000000, // ₹50,000 in paisa
      status,
      eventDate,
      eventType: "wedding",
      guestCount: 200,
      notes: "Seeded booking for testing state transitions.",
    });

    // Check availability block for vendor if accepted/confirmed/held/in_progress/completed
    if (["vendor_accepted", "customer_confirmed", "payment_pending", "payment_held", "in_progress", "completed"].includes(status)) {
      // Find date or insert it
      await db.insert(vendorAvailability).values({
        id: generateUlid(),
        vendorId: vendor.id,
        date: eventDate,
        isAvailable: false,
        bookingId,
      }).onConflictDoUpdate({
        target: [vendorAvailability.vendorId, vendorAvailability.date],
        set: { isAvailable: false, bookingId }
      });
    }

    // Create Default Milestones: 40% Advance, 35% Pre-Event, 25% Post-Event
    const milestoneSplits = [
      { name: "advance", label: "Advance Payment", pct: "40.00", ratio: 0.4 },
      { name: "pre_event", label: "Pre-Event Payment", pct: "35.00", ratio: 0.35 },
      { name: "post_event", label: "Post-Event Balance", pct: "25.00", ratio: 0.25 },
    ];

    const milestonesInserted: any[] = [];
    for (const m of milestoneSplits) {
      const milestoneId = generateUlid();
      const amount = Math.round(5000000 * m.ratio);
      
      let paymentStatus: typeof bookingMilestones.$inferInsert["paymentStatus"] = "pending";
      if (status === "payment_held" && m.name === "advance") paymentStatus = "held";
      if (status === "in_progress" && m.name === "advance") paymentStatus = "held";
      if (status === "completed") paymentStatus = "released";

      await db.insert(bookingMilestones).values({
        id: milestoneId,
        bookingId,
        name: m.name as any,
        label: m.label,
        amount,
        percentage: m.pct,
        dueDate: `2026-06-20`,
        paymentStatus,
        releasedAt: paymentStatus === "released" ? new Date() : null,
      });
      milestonesInserted.push({ id: milestoneId, amount, paymentStatus });
    }

    // Create Booking Events log (at least transition from inquiry to current status)
    await db.insert(bookingEvents).values({
      id: generateUlid(),
      bookingId,
      fromStatus: "inquiry",
      toStatus: status,
      actorId: status === "vendor_accepted" || status === "vendor_declined" || status === "vendor_countered" ? vendor.userId : customer.id,
      actorRole: status === "vendor_accepted" || status === "vendor_declined" || status === "vendor_countered" ? "vendor" : "customer",
      ipAddress: "127.0.0.1",
      metadata: { notes: "State initialized in seed script" },
    });

    // Create Conversation
    const conversationId = generateUlid();
    await db.insert(conversations).values({
      id: conversationId,
      bookingId,
      customerId: customer.id,
      vendorId: vendor.id,
      lastMessageAt: new Date(),
    });

    // Messages
    await db.insert(messages).values({
      id: generateUlid(),
      conversationId,
      senderId: customer.id,
      content: `Hello ${vendor.businessName}, I would like to book your services for my wedding.`,
      type: "text",
    });

    await db.insert(messages).values({
      id: generateUlid(),
      conversationId,
      senderId: vendor.userId,
      content: `Hi ${customer.name}, thank you for reaching out! Let me review the details.`,
      type: "text",
    });

    // Payments / Payouts if held or released
    if (status === "payment_held" || status === "in_progress" || status === "completed") {
      const advanceMilestone = milestonesInserted.find(m => m.paymentStatus === "held" || m.paymentStatus === "released");
      if (advanceMilestone) {
        const paymentId = generateUlid();
        await db.insert(payments).values({
          id: paymentId,
          bookingId,
          milestoneId: advanceMilestone.id,
          customerId: customer.id,
          vendorId: vendor.id,
          amount: advanceMilestone.amount,
          platformFee: Math.round(advanceMilestone.amount * 0.08), // 8% fee
          gstOnFee: Math.round(advanceMilestone.amount * 0.08 * 0.18), // 18% GST on fee
          status: "captured",
          escrowStatus: status === "completed" ? "released" : "held",
          paymentMethod: "upi",
          gatewayOrderId: `order_${generateUlid().substring(0, 10)}`,
          gatewayPaymentId: `pay_${generateUlid().substring(0, 10)}`,
          capturedAt: new Date(),
        });

        // Update milestone paymentId
        await db.insert(bookingMilestones).values({
          id: advanceMilestone.id,
          bookingId,
          name: "advance",
          label: "Advance Payment",
          amount: advanceMilestone.amount,
          percentage: "40.00",
          paymentId,
        }).onConflictDoUpdate({
          target: [bookingMilestones.id],
          set: { paymentId }
        });

        if (status === "completed") {
          // Payout
          await db.insert(paymentPayouts).values({
            id: generateUlid(),
            vendorId: vendor.id,
            bookingId,
            paymentId,
            amount: advanceMilestone.amount - Math.round(advanceMilestone.amount * 0.08),
            status: "completed",
            gatewayTransferId: `trf_${generateUlid().substring(0, 10)}`,
            completedAt: new Date(),
          });
        }
      }
    }

    // Review for Completed Booking
    if (status === "completed") {
      await db.insert(reviews).values({
        id: generateUlid(),
        bookingId,
        reviewerId: customer.id,
        vendorId: vendor.id,
        rating: 5,
        content: "Outstanding service! Prompt, professional, and exceeded all expectations. Highly recommended!",
        verified: true,
      });
    }
  }

  console.log("Database seeding completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error during seeding:", err);
    process.exit(1);
  });
