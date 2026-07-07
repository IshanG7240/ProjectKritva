export type MarketingPageSection = {
  heading?: string;
  paragraphs: string[];
};

export type MarketingPage = {
  title: string;
  description: string;
  sections: MarketingPageSection[];
};

export const MARKETING_PAGES = {
  about: {
    title: "About Kritva",
    description:
      "Kritva is the operating system for India's premium events — verified vendors, escrowed payments, and built-in compliance.",
    sections: [
      {
        paragraphs: [
          "Kritva connects event hosts with verified vendors across decor, venues, catering, and production. Every booking runs through escrow, so funds move only when milestones are met.",
          "We built Kritva for families, brands, and planners who need certainty — not another group chat chasing invoices and permits.",
        ],
      },
      {
        heading: "What we handle",
        paragraphs: [
          "Vendor verification and portfolio review",
          "Escrow-backed payments with milestone releases",
          "GST-ready invoicing and compliance workflows",
        ],
      },
    ],
  },
  "vendor-standards": {
    title: "Vendor standards",
    description:
      "How Kritva verifies vendors before they appear in the directory.",
    sections: [
      {
        paragraphs: [
          "Every vendor on Kritva completes identity verification, portfolio review, and pricing disclosure before going live. We audit past work, check business registration, and validate service categories.",
        ],
      },
      {
        heading: "Ongoing quality",
        paragraphs: [
          "Ratings and booking history stay visible on every profile.",
          "Repeated disputes or compliance failures can lead to suspension.",
          "Media and pricing must stay accurate — changes are reviewed.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    description: "Join the team building India's event infrastructure.",
    sections: [
      {
        paragraphs: [
          "We're hiring across engineering, operations, and vendor success in Bengaluru. If you care about trust, design, and Indian events, we'd like to hear from you.",
          "Send your resume and a short note to careers@kritva.in.",
        ],
      },
    ],
  },
  press: {
    title: "Press",
    description: "Media enquiries and brand assets for Kritva.",
    sections: [
      {
        paragraphs: [
          "For press enquiries, interviews, or logo usage, email press@kritva.in.",
          "We respond to media requests within two business days.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    description: "Terms governing use of the Kritva platform.",
    sections: [
      {
        paragraphs: [
          "By using Kritva you agree to book through the platform, pay via approved escrow flows, and provide accurate event details. Vendors agree to honour confirmed bookings and maintain disclosed pricing.",
        ],
      },
      {
        heading: "Bookings & payments",
        paragraphs: [
          "Quotes may be accepted, declined, or countered before a booking is confirmed.",
          "Customer funds are held in escrow until release conditions are met.",
          "Cancellations follow the policy shown at checkout for each booking.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: ["Questions about these terms: legal@kritva.in"],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "How Kritva collects, uses, and protects your data.",
    sections: [
      {
        paragraphs: [
          "We collect account details, booking information, and payment metadata needed to operate the platform. We do not sell personal data.",
        ],
      },
      {
        heading: "Data use",
        paragraphs: [
          "To authenticate users and process bookings",
          "To send transactional notifications about your events",
          "To comply with legal and regulatory requirements",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "You may request access or deletion of your account data by emailing privacy@kritva.in.",
        ],
      },
    ],
  },
  "escrow-policy": {
    title: "Escrow policy",
    description: "How Kritva holds and releases event payments.",
    sections: [
      {
        paragraphs: [
          "Customer payments are collected into regulated escrow before work begins. Funds are released to vendors only after agreed milestones — for example, deposit on confirmation and balance after event completion.",
        ],
      },
      {
        heading: "Disputes",
        paragraphs: [
          "If a booking dispute is raised, release may pause while Kritva reviews evidence from both parties. Our team aims to resolve escrow holds within five business days.",
        ],
      },
    ],
  },
  grievance: {
    title: "Grievance redressal",
    description: "How to raise a complaint about Kritva or a vendor.",
    sections: [
      {
        paragraphs: [
          "Email grievance@kritva.in with your booking reference, a description of the issue, and any supporting documents. We acknowledge complaints within 48 hours.",
        ],
      },
      {
        heading: "Escalation",
        paragraphs: [
          "If you are unsatisfied with the initial response, reply to your ticket asking for escalation. A senior operations lead will review within seven business days.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact",
    description: "Get in touch with the Kritva team.",
    sections: [
      {
        paragraphs: [
          "General enquiries: hello@kritva.in",
          "Vendor onboarding: vendors@kritva.in",
          "Support for active bookings: support@kritva.in",
        ],
      },
      {
        heading: "Office",
        paragraphs: ["Kritva Technologies Pvt. Ltd., Bengaluru, India"],
      },
    ],
  },
  pricing: {
    title: "Pricing",
    description: "How pricing works on Kritva.",
    sections: [
      {
        paragraphs: [
          "Vendor rates are listed in INR on each profile. Hosts see all-in quotes before confirming a booking — no hidden platform fees at checkout.",
        ],
      },
      {
        heading: "For vendors",
        paragraphs: [
          "Kritva charges a platform fee on completed bookings. Fee tiers are shared during vendor onboarding.",
          "Escrow and payment processing costs are included in the quoted total shown to customers.",
        ],
      },
    ],
  },
} as const satisfies Record<string, MarketingPage>;

export type MarketingPageSlug = keyof typeof MARKETING_PAGES;

export const MARKETING_PAGE_SLUGS = Object.keys(
  MARKETING_PAGES,
) as MarketingPageSlug[];

export function getMarketingPage(slug: string): MarketingPage | undefined {
  return MARKETING_PAGES[slug as MarketingPageSlug];
}
