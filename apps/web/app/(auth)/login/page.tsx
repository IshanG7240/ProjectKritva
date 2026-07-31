"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { storeReturnTo, isSafeReturnTo } from "@/lib/booking-form";
import { Loader2 } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Page } from "@/components/layout/page";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Sign-in failed. Please try again.",
  sync_failed: "We couldn't sync your account. Please try again.",
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err && ERROR_MESSAGES[err]) {
      setError(ERROR_MESSAGES[err]);
    }
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (returnTo && isSafeReturnTo(returnTo)) {
      storeReturnTo(returnTo);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <Page width="task" className="flex flex-1 items-center justify-center">
        <div className="w-full space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-title text-mk-ink">Kritva</h1>
            <p className="text-body text-mk-muted">
              Money held until the job is done.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-heading text-mk-ink">Sign in</h2>
                <p className="text-meta text-mk-muted">
                  Use your Google account to continue.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-danger-bg px-3 py-2 text-meta text-danger-fg"
                >
                  {error}
                </p>
              )}

              <Button
                id="btn-google-login"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full"
                size="lg"
                variant="primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-meta text-mk-muted">
            By continuing, you agree to Kritva&apos;s Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </Page>
    </div>
  );
}
