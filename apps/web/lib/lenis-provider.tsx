"use client";

/**
 * LenisProvider
 *
 * Boots a single Lenis instance, runs its RAF loop, and exposes a shared
 * `scrollY` MotionValue that is updated synchronously inside Lenis's own
 * `scroll` callback. This guarantees that every `useTransform` call based on
 * `useLenisScrollY()` reads the same eased position on the same frame —
 * eliminating any desync with native browser scroll events that Framer
 * Motion's default `useScroll` would otherwise produce.
 */

import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

// ─── Context ──────────────────────────────────────────────────────────────────

interface LenisContextValue {
  /** Smoothed absolute scroll position in pixels (mirrors Lenis's `scroll`). */
  scrollY: MotionValue<number>;
  /**
   * Normalised [0,1] progress from top to bottom of the page.
   * Derived from scrollY / (scrollHeight - innerHeight).
   */
  scrollYProgress: MotionValue<number>;
  /** The raw Lenis instance, in case a component needs `lenis.scrollTo`. */
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LenisProvider({ children }: { children: ReactNode }) {
  const scrollY = useMotionValue(0);
  const scrollYProgress = useMotionValue(0);
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Synchronously update MotionValues inside Lenis's scroll callback.
    // This fires inside Lenis's RAF tick, before the browser paints,
    // so every useTransform reading scrollY is guaranteed to see the same
    // eased value on the same frame.
    lenis.on("scroll", ({ scroll }: { scroll: number }) => {
      scrollY.set(scroll);
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      scrollYProgress.set(total > 0 ? scroll / total : 0);
    });

    function raf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [scrollY, scrollYProgress]);

  return (
    <LenisContext.Provider
      value={{ scrollY, scrollYProgress, lenis: lenisRef.current }}
    >
      {children}
    </LenisContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns the shared Lenis-driven `scrollY` MotionValue (absolute pixels). */
export function useLenisScrollY(): MotionValue<number> {
  const ctx = useContext(LenisContext);
  if (!ctx) throw new Error("useLenisScrollY must be used inside LenisProvider");
  return ctx.scrollY;
}

/**
 * Returns a [0,1] scroll progress MotionValue driven by Lenis.
 * Prefer `useLenisScrollY` + section-specific `useTransform` for
 * per-section parallax.
 */
export function useLenisScrollYProgress(): MotionValue<number> {
  const ctx = useContext(LenisContext);
  if (!ctx)
    throw new Error(
      "useLenisScrollYProgress must be used inside LenisProvider"
    );
  return ctx.scrollYProgress;
}
