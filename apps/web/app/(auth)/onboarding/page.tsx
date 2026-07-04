"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Store } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "customer" | "vendor";

/** Shape of PATCH /v1/auth/onboarding response data. */
interface OnboardingResult {
  id: string;
  role: Role;
  onboarding_complete: boolean;
}

/**
 * Onboarding page — shown immediately after first login.
 * User picks their role; vendors also supply a business name.
 * On success, redirects to the appropriate dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedRole) return;
    if (selectedRole === "vendor" && !businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload =
      selectedRole === "vendor"
        ? { role: "vendor", business_name: businessName.trim() }
        : { role: "customer" };

    const res = await apiClient.patch<OnboardingResult>(
      "/v1/auth/onboarding",
      payload
    );

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    // Route based on confirmed role from backend.
    const destination =
      res.data.role === "vendor" ? "/vendor-dashboard" : "/dashboard";
    router.push(destination);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            How will you use Kritva?
          </h1>
          <p className="text-sm text-muted-foreground">
            This helps us tailor your experience. You can&apos;t change this later.
          </p>
        </div>

        {/* Role selection cards */}
        <div className="grid grid-cols-2 gap-4">
          <RoleCard
            id="role-card-customer"
            icon={<User className="h-7 w-7" />}
            title="I am a Customer"
            description="Discover and book verified event vendors for your celebration."
            selected={selectedRole === "customer"}
            onClick={() => setSelectedRole("customer")}
            disabled={loading}
          />
          <RoleCard
            id="role-card-vendor"
            icon={<Store className="h-7 w-7" />}
            title="I am an Event Vendor"
            description="List your services, manage bookings, and receive secure payments."
            selected={selectedRole === "vendor"}
            onClick={() => setSelectedRole("vendor")}
            disabled={loading}
          />
        </div>

        {/* Business name input — only shown when vendor is selected */}
        {selectedRole === "vendor" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <label
              htmlFor="input-business-name"
              className="text-sm font-medium text-foreground"
            >
              Business Name
            </label>
            <Input
              id="input-business-name"
              placeholder="e.g. Delhi Dream Decorators"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          id="btn-onboarding-submit"
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your account…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}

/** Clickable role selection card. */
function RoleCard({
  id,
  icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-start gap-3 rounded border p-5 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "rounded p-2",
          selected ? "bg-background/15" : "bg-muted"
        )}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-none">{title}</p>
        <p
          className={cn(
            "text-xs leading-relaxed",
            selected ? "text-background/70" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      </div>
      {/* Selected checkmark */}
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-background/20">
          <svg
            viewBox="0 0 10 10"
            className="h-3 w-3 fill-background"
            aria-hidden="true"
          >
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
