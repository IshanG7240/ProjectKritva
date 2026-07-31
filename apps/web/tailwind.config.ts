/* eslint-disable */
import type { Config } from "tailwindcss";

const config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    fontSize: {
      display: [
        "clamp(2.25rem, 5vw, 3.5rem)",
        { lineHeight: "1.05", fontWeight: "600" },
      ],
      title: ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }],
      heading: ["1.0625rem", { lineHeight: "1.35", fontWeight: "600" }],
      subhead: ["0.9375rem", { lineHeight: "1.4", fontWeight: "600" }],
      body: ["0.9375rem", { lineHeight: "1.55", fontWeight: "400" }],
      meta: ["0.8125rem", { lineHeight: "1.45", fontWeight: "400" }],
      label: [
        "0.6875rem",
        { lineHeight: "1.2", fontWeight: "500", letterSpacing: "0.06em" },
      ],
      money: ["1.25rem", { lineHeight: "1.2", fontWeight: "600" }],
      "money-lg": ["2rem", { lineHeight: "1.1", fontWeight: "600" }],
    },
    borderRadius: {
      md: "8px",
      lg: "12px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        held: "hsl(var(--held))",
        success: {
          DEFAULT: "hsl(var(--success))",
          bg: "hsl(var(--success-bg))",
          fg: "hsl(var(--success-fg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          bg: "hsl(var(--warning-bg))",
          fg: "hsl(var(--warning-fg))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          bg: "hsl(var(--danger-bg))",
          fg: "hsl(var(--danger-fg))",
        },
        mk: {
          bg: "hsl(var(--mk-bg))",
          app: "hsl(var(--mk-app))",
          surface: "hsl(var(--mk-surface))",
          "surface-2": "hsl(var(--mk-surface-2))",
          ink: "hsl(var(--mk-ink))",
          muted: "hsl(var(--mk-muted))",
          border: "hsl(var(--mk-border))",
          line: "hsl(var(--mk-line))",
          navy: "hsl(var(--mk-navy))",
          "navy-hover": "hsl(var(--mk-navy-hover))",
          copper: "hsl(var(--mk-copper))",
          amber: "hsl(var(--mk-copper))",
          hero: "#18171A",
        },
      },
      boxShadow: {
        pop: "0 8px 30px rgba(28, 26, 22, 0.12)",
        sticky: "0 1px 0 rgba(28, 26, 22, 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
