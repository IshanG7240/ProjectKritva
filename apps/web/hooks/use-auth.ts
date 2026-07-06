"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import type { KritvaUser } from "@/hooks/use-require-auth";

interface AuthState {
  user: KritvaUser | null;
  loading: boolean;
}

/**
 * Reads the active session and syncs the Kritva user profile.
 * Does NOT redirect — use this for passive UI checks like the nav.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setState({ user: null, loading: false });
        return;
      }

      const res = await apiClient.post<{ user: KritvaUser }>("/v1/auth/sync", {
        name: session.user.user_metadata?.full_name ?? session.user.email,
        email: session.user.email,
        phone: session.user.phone ?? null,
      });

      if (cancelled) return;

      setState({
        user: res.data?.user ?? null,
        loading: false,
      });
    }

    sync();

    // Keep in sync with sign-in / sign-out events.
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
