"use client";

/**
 * App-level providers.
 * Wraps children with TanStack QueryClientProvider so any page or component
 * can use useQuery / useMutation without additional setup.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient instance per browser session; useState prevents recreation on re-render.
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Clear React Query cache on sign-out to prevent stale user data exposure.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
