"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

export type PennyDropStatus = "pending" | "verified" | "failed";

export interface VendorBankAccount {
  id: string;
  last_four: string;
  ifsc_code: string;
  account_holder_name: string;
  penny_drop_status: PennyDropStatus;
  gateway_account_id: string | null;
  verified_at: string | null;
  created_at: string;
}

type BankAccountPayload = {
  bank_account: VendorBankAccount | null;
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function statusLabel(status: PennyDropStatus): string {
  if (status === "verified") return "Verified";
  if (status === "failed") return "Verification failed";
  return "Needs verification";
}

function statusVariant(
  status: PennyDropStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "verified") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

async function saveBankAccount(input: {
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
}): Promise<VendorBankAccount> {
  const res = await apiClient.post<BankAccountPayload>(
    "/v1/payments/bank-accounts",
    input,
  );
  if (res.error || !res.data?.bank_account) {
    throw new Error(res.error?.message ?? "Could not save bank account.");
  }
  return res.data.bank_account;
}

async function verifyBankAccount(): Promise<{
  penny_drop_status: PennyDropStatus;
  verified_at?: string | null;
}> {
  const res = await apiClient.post<{
    penny_drop_status: PennyDropStatus;
    verified_at?: string | null;
  }>("/v1/payments/bank-accounts/verify", { amount: 100 });
  if (res.error || !res.data) {
    throw new Error(res.error?.message ?? "Could not verify bank account.");
  }
  return res.data;
}

export function BankAccountSection({
  bankAccount,
  isLoading,
  isError,
  onRetry,
}: {
  bankAccount: VendorBankAccount | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holderName, setHolderName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const hasAccount = !!bankAccount;
  const showForm = !hasAccount || editing;

  const saveMutation = useMutation({
    mutationFn: saveBankAccount,
    onSuccess: (saved) => {
      setAccountNumber("");
      setIfsc("");
      setHolderName("");
      setEditing(false);
      setFieldError(null);
      queryClient.setQueryData(["vendor-bank-account"], saved);
      queryClient.invalidateQueries({ queryKey: ["vendor-bank-account"] });
      toast.add({
        type: "success",
        title: "Bank account saved",
        description: `Account ending ····${saved.last_four}. Verify to receive payouts.`,
      });
    },
    onError: (err) => {
      toast.add({
        type: "error",
        title: "Could not save",
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyBankAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bank-account"] });
      if (data.penny_drop_status === "verified") {
        toast.add({
          type: "success",
          title: "Bank account verified",
          description: "You're ready to receive payouts.",
        });
      } else {
        toast.add({
          type: "error",
          title: "Verification failed",
          description: "Check the ₹1 deposit amount and try again.",
        });
      }
    },
    onError: (err) => {
      toast.add({
        type: "error",
        title: "Verification failed",
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const digits = accountNumber.replace(/\s/g, "");
    const ifscCode = ifsc.trim().toUpperCase();
    const name = holderName.trim();

    if (!/^\d{9,18}$/.test(digits)) {
      setFieldError("Account number must be 9–18 digits.");
      return;
    }
    if (!IFSC_RE.test(ifscCode)) {
      setFieldError("Enter a valid IFSC (e.g. SBIN0012345).");
      return;
    }
    if (name.length < 2) {
      setFieldError("Enter the account holder name.");
      return;
    }

    saveMutation.mutate({
      account_number: digits,
      ifsc_code: ifscCode,
      account_holder_name: name,
    });
  }

  function startEdit() {
    if (bankAccount) {
      setIfsc(bankAccount.ifsc_code);
      setHolderName(bankAccount.account_holder_name);
      setAccountNumber("");
    }
    setEditing(true);
  }

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-heading text-mk-ink">Bank account</h2>
        <Skeleton className="h-28 w-full rounded-lg" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <h2 className="text-heading text-mk-ink">Bank account</h2>
        <Card className="border-danger/30 bg-danger-bg p-4">
          <p className="text-body text-danger-fg">
            Could not load your bank account.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Try again
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-heading text-mk-ink">Bank account</h2>
        <p className="mt-0.5 text-body text-mk-muted">
          Where Kritva sends money after a job is released.
        </p>
        <p className="mt-1 text-meta text-mk-muted">
          Changing your bank details pauses payouts until we re-verify —
          usually within a day.
        </p>
      </div>

      {hasAccount && !editing ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium text-mk-ink">
              Bank account ending ····{bankAccount.last_four}
            </p>
            <Badge variant={statusVariant(bankAccount.penny_drop_status)}>
              {statusLabel(bankAccount.penny_drop_status)}
            </Badge>
          </div>
          <p className="mt-1 text-meta text-mk-muted">
            {bankAccount.account_holder_name} · {bankAccount.ifsc_code}
          </p>

          {bankAccount.penny_drop_status !== "verified" ? (
            <div className="mt-3 rounded-md border border-warning/30 bg-warning-bg px-3 py-2.5">
              <p className="text-body text-warning-fg">
                Confirm the ₹1 deposit we sent to this account. Payouts stay
                paused until it&apos;s verified.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate()}
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Confirm ₹1 deposit"
                )}
              </Button>
            </div>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={startEdit}
          >
            Change bank details
          </Button>
        </Card>
      ) : null}

      {showForm ? (
        <Card className="p-4">
          <form onSubmit={handleSubmit}>
            {hasAccount ? (
              <p className="mb-3 text-body text-warning-fg">
                Changing your bank details pauses payouts until we re-verify
                — usually within a day.
              </p>
            ) : (
              <p className="mb-3 text-body text-mk-muted">
                Add your account so we can pay you when a customer releases
                funds.
              </p>
            )}

            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="account-holder">
                  Account holder name
                </FieldLabel>
                <Input
                  id="account-holder"
                  autoComplete="name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Name as on the bank account"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-number">Account number</FieldLabel>
                <Input
                  id="account-number"
                  inputMode="numeric"
                  autoComplete="off"
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/[^\d\s]/g, ""))
                  }
                  placeholder="Enter full account number"
                />
                <FieldDescription>
                  Sent once, then encrypted. We only show the last four digits
                  after save.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ifsc">IFSC</FieldLabel>
                <Input
                  id="ifsc"
                  autoComplete="off"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="SBIN0012345"
                  maxLength={11}
                  className="uppercase"
                />
              </Field>
            </FieldGroup>

            {fieldError ? (
              <p className="mt-2 text-meta text-danger">{fieldError}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : hasAccount ? (
                  "Save new details"
                ) : (
                  "Save bank account"
                )}
              </Button>
              {hasAccount ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setEditing(false);
                    setAccountNumber("");
                    setFieldError(null);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
