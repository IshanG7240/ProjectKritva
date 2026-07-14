"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { apiClient } from "@/lib/api-client";

/** Kritva user profile returned by /v1/auth/sync. */
export interface KritvaUser {
  id: string;
  email: string;
  name: string;
  role: "customer" | "vendor" | "admin" | "superadmin";
  onboarding_complete: boolean;
}

interface AuthState {
  /** Supabase session user. Null while loading or unauthenticated. */
  user: KritvaUser | null;
  supabaseUser: User | null;
  loading: boolean;
}

/**
 * Reads the active Supabase session and fetches the Kritva user profile.
 * Redirects to /login if unauthenticated and to the correct dashboard if
 * the user's role doesn't match `requiredRole`.
 * `requiredRole` can be a single role or an array of accepted roles.
 */
export function useRequireAuth(
  requiredRole?:
    | "customer"
    | "vendor"
    | "admin"
    | "superadmin"
    | Array<"customer" | "vendor" | "admin" | "superadmin">,
): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    supabaseUser: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Fetch the Kritva-side profile to get role + onboarding status.
      const res = await apiClient.post<{ user: KritvaUser }>("/v1/auth/sync", {
        name: session.user.user_metadata?.full_name ?? session.user.email,
        email: session.user.email,
        phone: session.user.phone ?? null,
      });

      if (cancelled) return;

      if (res.error || !res.data) {
        router.replace("/login");
        return;
      }

      const kritvaUser = res.data.user;

      if (!kritvaUser.onboarding_complete) {
        router.replace("/onboarding");
        return;
      }

      // Normalise requiredRole to an array for uniform comparison.
      const allowed = requiredRole
        ? Array.isArray(requiredRole)
          ? requiredRole
          : [requiredRole]
        : null;

      if (allowed) {
        const hasAccess =
          allowed.includes(kritvaUser.role) ||
          (kritvaUser.role === "superadmin" && allowed.includes("admin"));

        if (!hasAccess) {
        // Redirect to the user's correct workspace.
        let correct = "/dashboard";
        if (kritvaUser.role === "vendor") correct = "/vendor";
        if (kritvaUser.role === "admin" || kritvaUser.role === "superadmin") {
          correct = "/admin";
        }
        router.replace(correct);
        return;
        }
      }

      setState({ user: kritvaUser, supabaseUser: session.user, loading: false });
    }

    check();

    // Listen for sign-out events.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [router, requiredRole]);

  return state;
}
