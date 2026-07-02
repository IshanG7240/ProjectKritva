/* eslint-disable */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { LenisProvider, useLenisScrollY } from "@/lib/lenis-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  Lock,
  Star,
  Clock,
  MapPin,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Banknote,
  Menu,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ─── Animation Variants ───────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO, delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Vendor Card Data ─────────────────────────────────────────────────────────

type EscrowStatus = "pending" | "secured" | "released";

interface VendorCardData {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  priceRange: string;
  responseTime: string;
  escrow: EscrowStatus;
  gradient: string;
  initials: string;
}

const VENDOR_CARDS: VendorCardData[] = [
  {
    id: "v1",
    name: "The Grand Banquet Co.",
    category: "Catering",
    location: "South Delhi",
    rating: 4.9,
    reviews: 142,
    priceRange: "₹850–₹1,400 /plate",
    responseTime: "~1 hr",
    escrow: "pending",
    gradient: "from-[#1C212C] to-[#13171F]",
    initials: "GB",
  },
  {
    id: "v2",
    name: "Meridian Events",
    category: "Venue",
    location: "Noida",
    rating: 4.7,
    reviews: 89,
    priceRange: "₹2.2L–₹4.8L /day",
    responseTime: "~2 hrs",
    escrow: "secured",
    gradient: "from-[#1C212C] to-[#13171F]",
    initials: "ME",
  },
  {
    id: "v3",
    name: "Lumière Photography",
    category: "Photography",
    location: "Gurugram",
    rating: 5.0,
    reviews: 56,
    priceRange: "₹45K–₹1.2L /event",
    responseTime: "~3 hrs",
    escrow: "released",
    gradient: "from-[#1C212C] to-[#13171F]",
    initials: "LP",
  },
];

// ─── Escrow Status Chip ────────────────────────────────────────────────────────

const ESCROW_CONFIG = {
  pending: {
    label: "Payment Pending",
    icon: Clock,
    bg: "bg-[#92400E]/50",
    text: "text-[#F59E0B]",
    border: "border-[#F59E0B]/30",
    dot: "bg-[#F59E0B]",
  },
  secured: {
    label: "Funds Secured",
    icon: Lock,
    bg: "bg-[#16653F]/50",
    text: "text-[#22C55E]",
    border: "border-[#22C55E]/30",
    dot: "bg-[#22C55E]",
  },
  released: {
    label: "Payment Released",
    icon: CheckCircle2,
    bg: "bg-[#16653F]/50",
    text: "text-[#22C55E]",
    border: "border-[#22C55E]/30",
    dot: "bg-[#22C55E]",
  },
};

function EscrowChip({ status }: { status: EscrowStatus }) {
  const cfg = ESCROW_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: [1, 1.05, 1] }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <Icon className="h-3 w-3" />
      {cfg.label}
    </motion.div>
  );
}

// ─── Vendor Preview Card ───────────────────────────────────────────────────────

function VendorPreviewCard({
  card,
  style,
}: {
  card: VendorCardData;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      style={style}
      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="relative flex w-[220px] flex-col rounded-[12px] bg-[#13171F] ring-1 ring-white/[0.06] overflow-hidden"
    >
      {/* Cover image area */}
      <div className={`relative h-[110px] bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#2A3040] text-lg font-semibold text-[#F5F6F8] font-display">
          {card.initials}
        </div>
        {/* Verified badge */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-[4px] bg-[#16653F]/80 px-1.5 py-0.5 text-[10px] font-medium text-[#22C55E] backdrop-blur-sm border border-[#22C55E]/30">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Verified
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="text-sm font-semibold text-[#F5F6F8] leading-snug">{card.name}</p>
          <p className="mt-0.5 text-xs text-[#9DA3B0] flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {card.category} · {card.location}
          </p>
        </div>

        {/* Rating + price */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-[#F5F6F8]">
            <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
            {card.rating}
            <span className="text-[#5C6270]">({card.reviews})</span>
          </span>
          <span className="font-mono text-xs tabular-nums text-[#9DA3B0]">
            {card.priceRange}
          </span>
        </div>

        {/* Response time */}
        <p className="text-[10px] text-[#5C6270]">
          <Clock className="inline h-2.5 w-2.5 mr-0.5" />
          Responds in {card.responseTime}
        </p>

        {/* Escrow chip */}
        <EscrowChip status={card.escrow} />
      </div>
    </motion.div>
  );
}

// ─── Animated Vendor Panel ─────────────────────────────────────────────────────

function VendorPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  // Animate the first card's escrow from pending → secured
  const [firstCardEscrow, setFirstCardEscrow] = useState<EscrowStatus>("pending");
  useEffect(() => {
    const timer = setTimeout(() => setFirstCardEscrow("secured"), 2800);
    return () => clearTimeout(timer);
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Opposite of cursor movement, clamped to ±6px
    mouseX.set(Math.max(-6, Math.min(6, -(e.clientX - cx) / 12)));
    mouseY.set(Math.max(-6, Math.min(6, -(e.clientY - cy) / 12)));
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const cards = [
    { ...VENDOR_CARDS[0]!, escrow: firstCardEscrow },
    VENDOR_CARDS[1]!,
    VENDOR_CARDS[2]!,
  ];

  return (
    <div
      ref={panelRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex h-[440px] items-center justify-center"
    >
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-[#3D7FFF]/5 via-transparent to-[#8B7CF6]/5" />

      <motion.div
        style={{ x: springX, y: springY }}
        className="flex gap-3 items-start"
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1, duration: 0.55, ease: EASE_OUT_EXPO }}
          >
            <VendorPreviewCard
              card={card as VendorCardData}
              style={{ marginTop: i === 1 ? "24px" : 0 }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Caption */}
      <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-[#5C6270]">
        Live escrow status · updates in real time
      </div>
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/[0.06] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#3D7FFF]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-[#F5F6F8]">Kritva</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { label: "For Customers", href: "#customers" },
            { label: "For Vendors", href: "#vendors" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[#9DA3B0] transition-colors duration-150 hover:text-[#F5F6F8]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-[#9DA3B0] hover:text-[#F5F6F8] transition-colors">
            Log In
          </Link>
          <Button
            className="h-9 rounded-[4px] bg-[#3D7FFF] px-4 text-sm text-white hover:bg-[#2563EB] transition-colors"
          >
            Start Planning
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[#9DA3B0] hover:text-[#F5F6F8]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="overflow-hidden border-t border-white/[0.06] bg-[#0B0E14]/95 backdrop-blur-md md:hidden"
          >
            <nav className="flex flex-col gap-1 px-6 py-4">
              {[
                { label: "For Customers", href: "#customers" },
                { label: "For Vendors", href: "#vendors" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-sm text-[#9DA3B0] hover:text-[#F5F6F8]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
                <Link href="/login" className="py-2 text-sm text-[#9DA3B0]">Log In</Link>
                <Button className="w-full rounded-[4px] bg-[#3D7FFF] text-white hover:bg-[#2563EB]">
                  Start Planning
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────────

function HeroSection() {
  const scrollY = useLenisScrollY();

  // Background layers move at 30% of scroll speed → they lag behind = depth.
  const bgY = useTransform(scrollY, [0, 800], [0, -240]);
  // Grid overlay drifts even slower (15%).
  const gridY = useTransform(scrollY, [0, 800], [0, -120]);
  // Vendor panel fades and scales down slightly as it exits the viewport.
  const panelOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const panelScale = useTransform(scrollY, [0, 500], [1, 0.94]);
  const panelY = useTransform(scrollY, [0, 500], [0, 40]);

  return (
    <section
      id="hero"
      className="relative min-h-screen overflow-hidden bg-[#0B0E14] pt-16"
    >
      {/* Background radial glow — parallax slow layer */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: bgY }}
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#3D7FFF]/8 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[#8B7CF6]/6 blur-[100px]" />
      </motion.div>

      {/* Grid overlay — parallax even-slower layer */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          y: gridY,
          backgroundImage:
            "linear-gradient(to right, #F5F6F8 1px, transparent 1px), linear-gradient(to bottom, #F5F6F8 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 pb-24 pt-24 md:flex-row md:items-center md:pt-32 lg:gap-16">
        {/* Left: copy */}
        <motion.div
          className="flex flex-1 flex-col gap-8 text-center md:text-left"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Launch pill */}
          <motion.div variants={fadeUp} custom={0} className="flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#3D7FFF]/30 bg-[#3D7FFF]/10 px-3 py-1 text-xs font-medium text-[#3D7FFF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3D7FFF] animate-pulse" />
              Launching in Delhi NCR · Be among the first
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            custom={0.05}
            className="font-display text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.05] tracking-tight text-[#F5F6F8]"
          >
            Every vendor verified.{" "}
            <span className="bg-gradient-to-r from-[#3D7FFF] to-[#8B7CF6] bg-clip-text text-transparent">
              Every rupee protected.
            </span>
          </motion.h1>

          {/* Sub-head */}
          <motion.p
            variants={fadeUp}
            custom={0.1}
            className="max-w-xl text-lg leading-relaxed text-[#9DA3B0]"
          >
            Plan your event in Delhi NCR with vendors who&apos;ve been
            background-checked, and payments that release only when you&apos;re satisfied.
          </motion.p>

          {/* Supporting copy — static placeholder, will be live count once vendor API exists */}
          <motion.p variants={fadeUp} custom={0.15} className="text-sm text-[#5C6270]">
            <Users className="inline h-4 w-4 mr-1.5 text-[#3D7FFF]" />
            50+ verified vendors across catering, venues, décor &amp; photography
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            custom={0.2}
            className="flex flex-col gap-3 sm:flex-row justify-center md:justify-start"
          >
            <Button
              id="hero-cta-primary"
              className="h-12 rounded-[4px] bg-[#3D7FFF] px-6 text-base font-semibold text-white hover:bg-[#2563EB] transition-colors duration-150 shadow-[0_4px_12px_rgba(61,127,255,0.35)]"
            >
              Start Planning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              id="hero-cta-secondary"
              className="h-12 rounded-[4px] border border-[#2A3040] bg-transparent px-6 text-base font-medium text-[#F5F6F8] hover:bg-[#1C212C] transition-colors duration-150"
            >
              I&apos;m a Vendor
              <ChevronRight className="ml-1 h-4 w-4 text-[#5C6270]" />
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={staggerContainer}
            className="flex flex-wrap gap-4 justify-center md:justify-start"
          >
            {[
              { icon: Lock, label: "Payments held in escrow until completion" },
              { icon: CheckCircle2, label: "KYC-verified vendors" },
              { icon: Shield, label: "RBI-compliant payment infrastructure" },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                custom={0.25}
                className="flex items-center gap-2 text-xs text-[#9DA3B0]"
              >
                <Icon className="h-3.5 w-3.5 text-[#22C55E] flex-shrink-0" />
                {label}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: vendor panel — scales + fades as user scrolls out */}
        <motion.div
          className="w-full md:w-[auto] flex-shrink-0"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT_EXPO }}
          style={{ opacity: panelOpacity, scale: panelScale, y: panelY }}
        >
          <VendorPanel />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0E14] to-transparent" />
    </section>
  );
}

// ─── How Escrow Works ──────────────────────────────────────────────────────────

const ESCROW_STEPS = [
  {
    step: "01",
    icon: Calendar,
    title: "Book",
    description: "Choose a verified vendor and confirm the scope, date, and deliverables. Both parties sign off digitally.",
    color: "text-[#3D7FFF]",
    bg: "bg-[#3D7FFF]/10",
    border: "border-[#3D7FFF]/20",
    accentRgb: "61,127,255",
    tags: ["Digital sign-off", "Scope locked", "Date confirmed"],
  },
  {
    step: "02",
    icon: Lock,
    title: "Funds Held",
    description: "Your payment is moved to a secure escrow account — not to the vendor. They can see it's committed, but can't touch it yet.",
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
    border: "border-[#F59E0B]/20",
    accentRgb: "245,158,11",
    tags: ["Funds escrowed", "Vendor notified", "Not yet released"],
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Release",
    description: "Once you confirm the event went as agreed, the funds are released. Dispute resolution available if anything goes wrong.",
    color: "text-[#22C55E]",
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/20",
    accentRgb: "34,197,94",
    tags: ["Satisfaction check", "Instant release", "Dispute path available"],
  },
];

function HowItWorksSection() {
  // Outer container is 300vh so the browser has scroll range to consume while
  // the inner panel stays pinned (sticky top-0 h-screen).
  const containerRef = useRef<HTMLDivElement>(null);

  // Scope useScroll to this section's scroll track — progress goes 0→1
  // entirely within this section regardless of page offset.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStep, setActiveStep] = useState(0);
  const [stepFraction, setStepFraction] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v: number) => {
      const clamped = Math.max(0, Math.min(0.9999, v));
      const raw = clamped * ESCROW_STEPS.length;
      const step = Math.min(Math.floor(raw), ESCROW_STEPS.length - 1);
      setActiveStep(step);
      setStepFraction(raw - Math.floor(raw));
    });
    return unsub;
  }, [scrollYProgress]);

  const currentStep = ESCROW_STEPS[activeStep]!;

  return (
    <div
      ref={containerRef}
      id="how-it-works"
      style={{ height: "300vh" }}
      className="relative"
    >
      {/* Sticky panel — stays fixed while outer container scrolls */}
      <div className="sticky top-0 h-screen bg-[#0B0E14] flex flex-col overflow-hidden">

        {/* Ambient glow shifts colour per step */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{
            background: `radial-gradient(ellipse 60% 45% at 50% 0%, rgba(${currentStep.accentRgb},0.08) 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-16 md:py-20">

          {/* Static header */}
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#3D7FFF]">
              How It Works
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-[#F5F6F8]">
              Trust built into every payment
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[#9DA3B0]">
              Escrow isn&apos;t a feature — it&apos;s the core of how Kritva works. Your money is never at risk.
            </p>
          </div>

          {/* Progress track */}
          <div className="mx-auto mb-6 flex w-full max-w-xs gap-2">
            {ESCROW_STEPS.map((step, i) => (
              <div key={step.step} className="h-0.5 flex-1 rounded-full bg-[#2A3040] overflow-hidden">
                <motion.div
                  className="h-full rounded-full origin-left"
                  style={{ background: `rgb(${step.accentRgb})` }}
                  animate={{
                    scaleX:
                      i < activeStep ? 1
                      : i === activeStep ? stepFraction
                      : 0,
                  }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            ))}
          </div>

          {/* Step counter pill */}
          <div className="mb-10 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={activeStep}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${currentStep.border} ${currentStep.color}`}
                style={{ background: `rgba(${currentStep.accentRgb},0.08)` }}
              >
                Step {activeStep + 1} of {ESCROW_STEPS.length}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Steps — stacked; one visible at a time */}
          <div className="relative flex flex-1 flex-col items-center justify-center">
            {ESCROW_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              // -1 = past (exited upward), 0 = current, +1 = upcoming (below)
              const position = i - activeStep;

              return (
                <motion.div
                  key={step.step}
                  animate={{
                    opacity: position === 0 ? 1 : position === -1 ? 0.12 : 0,
                    y: position === 0 ? 0 : position === -1 ? -36 : 52,
                    scale: position === 0 ? 1 : 0.95,
                    filter: position === 0 ? "blur(0px)" : "blur(3px)",
                  }}
                  transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                  className="absolute inset-x-0 mx-auto flex w-full max-w-2xl flex-col gap-6 md:flex-row md:items-start"
                  aria-hidden={position !== 0}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <motion.div
                      animate={{
                        boxShadow:
                          position === 0
                            ? `0 0 0 1px rgba(${step.accentRgb},0.3), 0 0 36px rgba(${step.accentRgb},0.18)`
                            : "0 0 0 1px rgba(255,255,255,0.06)",
                      }}
                      transition={{ duration: 0.45 }}
                      className={`flex h-16 w-16 items-center justify-center rounded-[16px] bg-[#0B0E14] ${step.color}`}
                    >
                      <StepIcon className="h-7 w-7" />
                    </motion.div>
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className={`font-mono text-4xl font-bold ${step.color} opacity-20`}>
                        {step.step}
                      </span>
                      <h3 className={`text-2xl font-bold ${step.color}`}>{step.title}</h3>
                    </div>
                    <p className="max-w-md text-lg leading-relaxed text-[#9DA3B0]">
                      {step.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {step.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-[4px] border px-2 py-0.5 text-xs font-medium ${step.border} ${step.color}`}
                          style={{ background: `rgba(${step.accentRgb},0.06)` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Scroll nudge — fades out after first step */}
          <motion.p
            animate={{ opacity: activeStep === 0 ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none mt-auto text-center text-xs text-[#5C6270]"
          >
            ↓ Scroll to see how escrow works
          </motion.p>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Section ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  function start() {
    if (started) return;
    setStarted(true);
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return { count, start };
}

const STATS = [
  { value: 50, suffix: "+", label: "Verified vendors", sublabel: "background-checked & KYC'd", icon: Users },
  { value: 8, suffix: "+", label: "Event categories", sublabel: "catering, venues, décor & more", icon: Building2 },
  { value: 1, suffix: " city", label: "Live now", sublabel: "Delhi NCR — more coming soon", icon: MapPin },
  { value: 0, suffix: "%", label: "Customer platform fee", sublabel: "free to plan your event", icon: Banknote },
];

function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const { count, start } = useCountUp(stat.value);
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={start}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: EASE_OUT_EXPO }}
      className="flex flex-col gap-3 rounded-[12px] bg-[#13171F] p-6 ring-1 ring-white/[0.06]"
    >
      <div className="flex items-center gap-2 text-[#9DA3B0]">
        <Icon className="h-4 w-4 text-[#3D7FFF]" />
        <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
      </div>
      <p className="font-display text-4xl font-bold text-[#F5F6F8] tabular-nums">
        {count}{stat.suffix}
      </p>
      <p className="text-sm text-[#5C6270]">{stat.sublabel}</p>
    </motion.div>
  );
}

function StatsSection() {
  const scrollY = useLenisScrollY();
  // Foreground cards move at natural speed; heading drifts slower (parallax bg feel).
  const headingY = useTransform(scrollY, [600, 1400], [30, -20]);
  const cardsY = useTransform(scrollY, [600, 1400], [50, -10]);

  return (
    <section className="bg-[#0B0E14] py-16 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mb-12 text-center"
          style={{ y: headingY }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.p variants={fadeUp} className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8B7CF6]">
            By the numbers
          </motion.p>
          <motion.h2 variants={fadeUp} custom={0.05} className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#F5F6F8]">
            A platform built for trust at scale
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ y: cardsY }}
        >
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Value Props ───────────────────────────────────────────────────────────────

const VALUE_PROPS = [
  {
    icon: CheckCircle2,
    iconColor: "text-[#22C55E]",
    iconBg: "bg-[#22C55E]/10",
    title: "KYC-verified vendors only",
    description:
      "Every vendor on Kritva has submitted Aadhaar, GST documentation, and business proof. No anonymous listings, no ghost vendors.",
  },
  {
    icon: Lock,
    iconColor: "text-[#3D7FFF]",
    iconBg: "bg-[#3D7FFF]/10",
    title: "Escrow — never lose a deposit",
    description:
      "Deposits go into a regulated escrow account, not straight to the vendor. Funds release only when you confirm the event was completed satisfactorily.",
  },
  {
    icon: TrendingUp,
    iconColor: "text-[#8B7CF6]",
    iconBg: "bg-[#8B7CF6]/10",
    title: "AI-assisted planning",
    description:
      "Our planning assistant helps you build checklists, compare vendors on budget and availability, and flag scheduling conflicts — before they become problems.",
  },
  {
    icon: Shield,
    iconColor: "text-[#F59E0B]",
    iconBg: "bg-[#F59E0B]/10",
    title: "Dispute resolution built in",
    description:
      "If a vendor doesn't show up or delivers something off-spec, you have a clear dispute path. We mediate, and funds stay protected until resolution.",
  },
];

function ValuePropsSection() {
  const scrollY = useLenisScrollY();
  // Heading floats up faster than the cards — creates foreground/background depth.
  const headingY = useTransform(scrollY, [1100, 2000], [40, -30]);
  const cardsY = useTransform(scrollY, [1100, 2000], [60, -10]);

  return (
    <section id="customers" className="bg-[#13171F] py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mb-16 text-center"
          style={{ y: headingY }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
        >
          <motion.p variants={fadeUp} className="mb-3 text-xs font-medium uppercase tracking-widest text-[#22C55E]">
            Why Kritva
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={0.05}
            className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-[#F5F6F8]"
          >
            Finally, a platform that takes{" "}
            <span className="text-[#3D7FFF]">₹10L weddings</span> seriously
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.1} className="mx-auto mt-4 max-w-lg text-[#9DA3B0]">
            Built from the ground up for high-stakes events — not adapted from a generic
            marketplace template.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2"
          style={{ y: cardsY }}
        >
          {VALUE_PROPS.map((prop, i) => (
            <motion.div
              key={prop.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE_OUT_EXPO }}
              className="flex gap-4 rounded-[12px] bg-[#1C212C] p-6 ring-1 ring-white/[0.04]"
            >
              <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] ${prop.iconBg}`}>
                <prop.icon className={`h-5 w-5 ${prop.iconColor}`} />
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-[#F5F6F8]">{prop.title}</h3>
                <p className="text-sm leading-relaxed text-[#9DA3B0]">{prop.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Vendor CTA Section ────────────────────────────────────────────────────────

function VendorCtaSection() {
  return (
    <section id="vendors" className="bg-[#0B0E14] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1C212C] via-[#13171F] to-[#0B0E14] p-8 ring-1 ring-white/[0.06] md:p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
        >
          {/* Background accents */}
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#8B7CF6]/10 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 left-24 h-48 w-48 rounded-full bg-[#3D7FFF]/8 blur-[80px]" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <Badge className="mb-4 rounded-[4px] border-[#8B7CF6]/30 bg-[#8B7CF6]/10 text-[#8B7CF6]">
                For Vendors
              </Badge>
              <h2 className="text-[clamp(1.5rem,3.5vw,2rem)] font-bold text-[#F5F6F8]">
                Stop paying 15–20% to middlemen.{" "}
                <span className="text-[#8B7CF6]">Earn more. Work smarter.</span>
              </h2>
              <p className="mt-4 text-[#9DA3B0]">
                Join Kritva as a verified vendor. 8–10% commission — less than half of what
                traditional event aggregators charge — with guaranteed payment protection and
                a direct line to serious event planners.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {[
                  "Your own professional portfolio page",
                  "Direct messaging with clients — no middlemen",
                  "Guaranteed payment via escrow",
                  "Verified badge builds trust and wins more bookings",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#9DA3B0]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#22C55E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 md:flex-shrink-0">
              <Button
                id="vendor-cta-primary"
                className="h-12 w-full rounded-[4px] bg-[#8B7CF6] px-8 text-base font-semibold text-white hover:bg-[#7C6EE6] transition-colors md:w-auto"
              >
                Become a Vendor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-[#5C6270]">
                KYC verification takes under 48 hours
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section className="bg-[#0B0E14] py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="flex flex-col items-center gap-6"
        >
          <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-widest text-[#3D7FFF]">
            Get started
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={0.05}
            className="font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-tight text-[#F5F6F8]"
          >
            Your next event. Protected from day one.
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.1} className="max-w-md text-[#9DA3B0]">
            Browse verified vendors, get quotes, and book with the confidence that your money
            is safe — no WhatsApp chaos, no deposit anxiety.
          </motion.p>
          <motion.div
            variants={fadeUp}
            custom={0.15}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button
              id="final-cta-primary"
              className="h-12 rounded-[4px] bg-[#3D7FFF] px-8 text-base font-semibold text-white hover:bg-[#2563EB] transition-colors shadow-[0_4px_12px_rgba(61,127,255,0.35)]"
            >
              Start Planning Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              id="final-cta-vendor"
              className="h-12 rounded-[4px] border border-[#2A3040] bg-transparent px-8 text-base font-medium text-[#F5F6F8] hover:bg-[#1C212C] transition-colors"
            >
              Join as a Vendor
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={0.2} className="text-xs text-[#5C6270]">
            Free for event planners · No credit card required
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0B0E14] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#3D7FFF]">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-[#F5F6F8]">Kritva</span>
            </div>
            <p className="max-w-xs text-sm text-[#5C6270]">
              Verified vendors. Secure payments. Delhi NCR&apos;s first trust-first event
              marketplace.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {[
              {
                heading: "Platform",
                links: ["For Customers", "For Vendors", "How It Works", "Pricing"],
              },
              {
                heading: "Company",
                links: ["About", "Blog", "Careers", "Press"],
              },
              {
                heading: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Refund Policy"],
              },
            ].map((group) => (
              <div key={group.heading} className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9DA3B0]">
                  {group.heading}
                </p>
                {group.links.map((link) => (
                  <Link
                    key={link}
                    href="#"
                    className="text-sm text-[#5C6270] hover:text-[#9DA3B0] transition-colors"
                  >
                    {link}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 text-center text-xs text-[#5C6270]">
          <p>© 2026 Kritva Technologies Pvt. Ltd. · Delhi, India</p>
          <p>
            Payments processed via RBI-compliant escrow infrastructure ·{" "}
            <span className="text-[#22C55E]">●</span> All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MarketingHomePage() {
  return (
    <LenisProvider>
      {/* Skip to content for accessibility */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[4px] focus:bg-[#3D7FFF] focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to content
      </a>

      <Nav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <StatsSection />
        <ValuePropsSection />
        <VendorCtaSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </LenisProvider>
  );
}
