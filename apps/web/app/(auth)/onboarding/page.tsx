"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Page } from "@/components/layout/page";
import { Loader2, User, Store, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "customer" | "vendor";

interface OnboardingResult {
  id: string;
  role: Role;
  onboarding_complete: boolean;
}

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
      payload,
    );

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    const destination = res.data.role === "vendor" ? "/vendor" : "/dashboard";
    router.push(destination);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <Page width="task" className="flex flex-1 items-center justify-center">
        <div className="w-full space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-title text-mk-ink">
              How will you use Kritva?
            </h1>
            <p className="text-body text-mk-muted">
              This helps us tailor your experience. You can&apos;t change this later.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RoleCard
              id="role-card-customer"
              icon={<User className="size-6" />}
              title="I am a Customer"
              description="Discover and book verified event vendors."
              selected={selectedRole === "customer"}
              onClick={() => setSelectedRole("customer")}
              disabled={loading}
            />
            <RoleCard
              id="role-card-vendor"
              icon={<Store className="size-6" />}
              title="I am an Event Vendor"
              description="List services, manage bookings, receive payments."
              selected={selectedRole === "vendor"}
              onClick={() => setSelectedRole("vendor")}
              disabled={loading}
            />
          </div>

          {selectedRole === "vendor" && (
            <div className="space-y-1.5">
              <Label htmlFor="input-business-name">Business name</Label>
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

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-bg px-3 py-2 text-meta text-danger-fg"
            >
              {error}
            </p>
          )}

          <Button
            id="btn-onboarding-submit"
            onClick={handleSubmit}
            disabled={!selectedRole || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Setting up your account…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </Page>
    </div>
  );
}

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
    <Card
      id={id}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative flex min-h-[44px] cursor-pointer flex-col items-start gap-3 p-5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled && "pointer-events-none opacity-50",
        selected
          ? "border-mk-navy bg-mk-surface-2"
          : "hover:border-mk-navy/40 hover:bg-mk-surface-2",
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-md",
          selected ? "bg-mk-navy text-white" : "bg-mk-line text-mk-ink",
        )}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-subhead text-mk-ink">{title}</p>
        <p className="text-meta text-mk-muted">{description}</p>
      </div>
      {selected && (
        <span
          className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-mk-navy text-white"
          aria-hidden="true"
        >
          <Check className="size-3" />
        </span>
      )}
    </Card>
  );
}
