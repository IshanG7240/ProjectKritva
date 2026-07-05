"use client";

/**
 * App-level providers.
 * Wraps children with TanStack QueryClientProvider so any page or component
 * can use useQuery / useMutation without additional setup.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient instance per browser session; useState prevents recreation on re-render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
