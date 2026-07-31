"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { AppNav } from "@/components/layout/app-nav";
import { consumeReturnTo } from "@/lib/booking-form";
import { Page } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * OAuth callback page — client-side only.
 *
 * Supabase's browser client (implicit flow) puts the session tokens in the
 * URL hash fragment (#access_token=...). Hash fragments are never sent to
 * the server, so this MUST be a client page — not a route handler — so the
 * Supabase SDK can read the hash and establish the session itself.
 *
 * Flow: Google → Supabase → /callback (this page)
 *   1. supabase.auth.getSession() picks up the hash and creates a session.
 *   2. POST /v1/auth/sync registers the user in Kritva's DB.
 *   3. Redirect to /onboarding or the appropriate dashboard.
 */
export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      // The SDK automatically exchanges the hash fragment for a session.
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.replace("/login?error=auth_failed");
        return;
      }

      // Sync user with the Kritva backend.
      const res = await apiClient.post<{ user: { role: string; onboarding_complete: boolean } }>(
        "/v1/auth/sync",
        {
          name: session.user.user_metadata?.full_name ?? session.user.email,
          email: session.user.email,
          // Phone is not provided by Google OAuth — omit rather than sending null.
          ...(session.user.phone ? { phone: session.user.phone } : {}),
        }
      );

      if (res.error || !res.data) {
        // Temp: log the actual error so we can diagnose in browser console
        console.error("[callback] sync failed:", res.error);
        router.replace("/login?error=sync_failed");
        return;
      }

      const { role, onboarding_complete } = res.data.user;

      if (!onboarding_complete) {
        router.replace("/onboarding");
        return;
      }

      const returnTo = consumeReturnTo();
      if (returnTo) {
        router.replace(returnTo);
        return;
      }

      if (role === "vendor") {
        router.replace("/vendor");
        return;
      }
      if (role === "admin" || role === "superadmin") {
        router.replace("/admin");
        return;
      }
      router.replace("/vendors");
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <Page width="task" className="flex flex-1 items-center justify-center">
        <div className="w-full space-y-4" aria-busy="true" aria-live="polite">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-heading text-mk-ink">Signing you in…</p>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-11 w-full" />
            </CardContent>
          </Card>
        </div>
      </Page>
    </div>
  );
}
