"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { Page, PageHeader } from "@/components/layout/page";
import { AvailabilityCalendar } from "@/components/vendor/calendar/availability-calendar";
import {
  indexAvailability,
  type AvailabilityPayload,
  type AvailabilityRow,
} from "@/components/vendor/calendar/availability-types";

const QUERY_KEY = ["vendor-availability"] as const;

async function fetchAvailability(): Promise<AvailabilityRow[]> {
  const res = await apiClient.get<AvailabilityPayload>(
    "/v1/vendors/me/availability",
  );
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data?.dates) ? res.data.dates : [];
}

async function putAvailability(
  dates: Array<{ date: string; is_available: boolean }>,
): Promise<AvailabilityRow[]> {
  const res = await apiClient.put<AvailabilityPayload>(
    "/v1/vendors/me/availability",
    { dates },
  );
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data?.dates) ? res.data.dates : [];
}

function applyOptimistic(
  current: AvailabilityRow[] | undefined,
  updates: Array<{ date: string; is_available: boolean }>,
): AvailabilityRow[] {
  const map = indexAvailability(current);
  for (const item of updates) {
    if (item.is_available) {
      map.delete(item.date);
    } else {
      map.set(item.date, {
        date: item.date,
        is_available: false,
        booking_id: null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default function VendorCalendarPage() {
  const { user, loading } = useRequireAuth("vendor");
  const queryClient = useQueryClient();

  const availabilityQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAvailability,
    enabled: !loading && !!user,
  });

  const mutation = useMutation({
    mutationFn: putAvailability,
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<AvailabilityRow[]>(QUERY_KEY);
      queryClient.setQueryData<AvailabilityRow[]>(QUERY_KEY, (old) =>
        applyOptimistic(old, updates),
      );
      return { previous };
    },
    onError: (error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      toast.add({
        title: "Couldn't update calendar",
        description:
          error instanceof Error ? error.message : "Please try again.",
        type: "error",
      });
    },
    onSuccess: (rows) => {
      queryClient.setQueryData(QUERY_KEY, rows);
    },
  });

  function handleToggleDay(dateKey: string, nextAvailable: boolean) {
    const row = availabilityQuery.data?.find((d) => d.date === dateKey);
    if (row?.booking_id) {
      toast.add({
        title: "Booked day",
        description: "Days with a booking can't be changed here.",
        type: "info",
      });
      return;
    }
    mutation.mutate([{ date: dateKey, is_available: nextAvailable }]);
  }

  function handleBlockRange(dateKeys: string[]) {
    if (dateKeys.length === 0) return;
    const byDate = indexAvailability(availabilityQuery.data);
    const updates = dateKeys
      .filter((key) => !byDate.get(key)?.booking_id)
      .map((date) => ({ date, is_available: false as const }));
    if (updates.length === 0) {
      toast.add({
        title: "Nothing to block",
        description: "Those days are already booked or blocked.",
        type: "info",
      });
      return;
    }
    mutation.mutate(updates);
  }

  if (loading || !user) return null;

  return (
    <Page width="wide">
      <PageHeader
        title="Calendar"
        back={{ href: "/vendor", label: "Back to enquiries" }}
      />
      <p className="mb-4 text-body text-mk-muted">
        Block days you&apos;re not free. Open days need no marking — customers
        see you as available unless a day is blocked or booked.
      </p>

      <AvailabilityCalendar
        dates={availabilityQuery.data}
        isLoading={availabilityQuery.isLoading}
        isError={availabilityQuery.isError}
        isSaving={mutation.isPending}
        onRetry={() => availabilityQuery.refetch()}
        onToggleDay={handleToggleDay}
        onBlockRange={handleBlockRange}
      />

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
