export type MarketingPageSection = {
  heading?: string;
  paragraphs: string[];
};

export type MarketingPage = {
  title: string;
  description: string;
  sections: MarketingPageSection[];
  comingSoon?: boolean;
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
    comingSoon: true,
    sections: [],
  },
  privacy: {
    title: "Privacy policy",
    description: "How Kritva collects, uses, and protects your data.",
    comingSoon: true,
    sections: [],
  },
  "escrow-policy": {
    title: "Escrow policy",
    description: "How Kritva holds and releases event payments.",
    comingSoon: true,
    sections: [],
  },
  grievance: {
    title: "Grievance redressal",
    description: "How to raise a complaint about Kritva or a vendor.",
    comingSoon: true,
    sections: [],
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
