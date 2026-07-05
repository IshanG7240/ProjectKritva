"use client";

/**
 * Vendor directory page.
 * Fetches approved vendors from GET /v1/vendors and supports
 * live category filtering via a native <select> dropdown.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Shape of a single vendor returned by the list endpoint.
interface Vendor {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  avg_rating: number | null;
  rating_count: number;
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
}

// API response shape after apiClient unwraps the outer `data` envelope.
interface VendorsResponse {
  vendors: Vendor[];
}

// Known categories for the filter dropdown.
const CATEGORIES = [
  "Catering",
  "Photography",
  "Decor",
  "Venue",
  "Entertainment",
  "Event Management",
];

/** Fetches vendor list, optionally filtered by category. */
async function fetchVendors(category: string): Promise<Vendor[]> {
  const path = category
    ? `/v1/vendors?category=${encodeURIComponent(category)}`
    : "/v1/vendors";

  const res = await apiClient.get<VendorsResponse>(path);

  if (res.error) {
    throw new Error(res.error.message);
  }

  return res.data?.vendors ?? [];
}

export default function VendorsPage() {
  // Selected category drives the query key, triggering automatic refetch on change.
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: vendors, isLoading, isError, error } = useQuery({
    queryKey: ["vendors", selectedCategory],
    queryFn: () => fetchVendors(selectedCategory),
  });

  if (isLoading) return <div>Loading...</div>;

  if (isError) {
    return (
      <div>
        Error loading vendors:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <main>
      <h1>Vendor Directory</h1>

      {/* Category filter */}
      <div>
        <label htmlFor="category-filter">Filter by category</label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat.toLowerCase()}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Vendor list */}
      {vendors && vendors.length === 0 ? (
        <p>No vendors found{selectedCategory ? ` for "${selectedCategory}"` : ""}.</p>
      ) : (
        <ul>
          {vendors?.map((vendor) => (
            <li key={vendor.id}>
              <span>{vendor.business_name}</span>
              {vendor.avg_rating != null && (
                <span> — Rating: {vendor.avg_rating}</span>
              )}
              <Link href={`/vendors/${vendor.slug}`}>View Profile</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
