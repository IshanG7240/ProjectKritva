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
      "Kritva sits between the person planning an event and the people supplying it — so organisers can compare honestly, and vendors actually get paid.",
    sections: [
      {
        paragraphs: [
          "People in India still plan events on WhatsApp: fifteen quotes in fifteen shapes, then an advance to someone they've never met. Organisers can't compare or trust. Vendors can't filter tyre-kickers, and chase balances for months after spending their own money on materials.",
          "Kritva holds the transaction together. Money sits with a licensed payment partner until the job is done. We instruct when it moves — we never hold customer funds ourselves.",
        ],
      },
      {
        heading: "What we're building first",
        paragraphs: [
          "Photography in Delhi NCR — packages you can compare, one payment held until delivery, then release to the photographer's bank. Catering (quotes) and venues come next. We finish one category until a real vendor's account receives real money.",
        ],
      },
    ],
  },
  "vendor-standards": {
    title: "Vendor standards",
    description:
      "What a photographer needs before they appear in search.",
    sections: [
      {
        paragraphs: [
          "For photography, a listing needs a category, at least one priced package, a profile photo, and five portfolio photos. Without sample work, a photographer isn't sellable — so we don't show them.",
          "A verified badge appears only after we've actually checked the vendor. New photographers with no reviews show no rating — not zero stars.",
        ],
      },
      {
        heading: "On the job",
        paragraphs: [
          "Contact details stay hidden until payment is held — so the deal (and the money protection) stay on Kritva.",
          "Repeated disputes or incomplete delivery can lead to suspension.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    description: "Working on Kritva.",
    sections: [
      {
        paragraphs: [
          "We're a small team. If you care about trust in Indian events and want to help close the loop from enquiry to a vendor's bank account, email careers@kritva.in with a short note.",
        ],
      },
    ],
  },
  press: {
    title: "Press",
    description: "Media enquiries for Kritva.",
    sections: [
      {
        paragraphs: [
          "For press enquiries or logo usage, email press@kritva.in.",
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
    description: "How payments are held and released on Kritva.",
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
    ],
  },
  pricing: {
    title: "Pricing",
    description: "How money and fees work on Kritva.",
    sections: [
      {
        paragraphs: [
          "Organisers pay the package total shown on the booking — no platform fee at checkout. Money is held with our payment partner until the work is done, then released to the vendor.",
        ],
      },
      {
        heading: "For vendors",
        paragraphs: [
          "Kritva takes a commission from the vendor payout when money is released. The default is 2%, set per category, and shown as a line item — not deducted silently. The rate on a booking is fixed when you accept; a later settings change doesn't alter an agreed job.",
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
