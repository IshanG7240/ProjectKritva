"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { apiClient } from "@/lib/api-client";
import { Page, PageHeader } from "@/components/layout/page";
import {
  BankAccountSection,
  type VendorBankAccount,
} from "@/components/vendor/payouts/bank-account-section";
import {
  MoneySections,
  type PayoutBooking,
} from "@/components/vendor/payouts/money-sections";

async function fetchBankAccount(): Promise<VendorBankAccount | null> {
  const res = await apiClient.get<{ bank_account: VendorBankAccount | null }>(
    "/v1/payments/bank-accounts",
  );
  if (res.error) throw new Error(res.error.message);
  return res.data?.bank_account ?? null;
}

async function fetchVendorBookings(): Promise<PayoutBooking[]> {
  const res = await apiClient.get<PayoutBooking[]>("/v1/bookings?role=vendor");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

export default function VendorPayoutsPage() {
  const { user, loading } = useRequireAuth("vendor");

  const bankQuery = useQuery({
    queryKey: ["vendor-bank-account"],
    queryFn: fetchBankAccount,
    enabled: !loading && !!user,
  });

  const bookingsQuery = useQuery({
    queryKey: ["bookings", "vendor"],
    queryFn: fetchVendorBookings,
    enabled: !loading && !!user,
  });

  if (loading || !user) return null;

  return (
    <Page width="wide">
      <PageHeader
        title="Payouts"
        back={{ href: "/vendor", label: "Back to enquiries" }}
      />
      <p className="mb-6 text-body text-mk-muted">
        Your bank account, money held for you, and what&apos;s been paid out.
      </p>

      <div className="space-y-8">
        <BankAccountSection
          bankAccount={bankQuery.data}
          isLoading={bankQuery.isLoading}
          isError={bankQuery.isError}
          onRetry={() => bankQuery.refetch()}
        />

        <MoneySections
          bookings={bookingsQuery.data}
          isLoading={bookingsQuery.isLoading}
          isError={bookingsQuery.isError}
          onRetry={() => bookingsQuery.refetch()}
        />
      </div>

      <p className="mt-8 text-meta text-mk-muted">
        <Link
          href="/vendor"
          className="font-medium text-mk-navy underline-offset-2 hover:underline"
        >
          Back to enquiries
        </Link>
      </p>
    </Page>
  );
}
