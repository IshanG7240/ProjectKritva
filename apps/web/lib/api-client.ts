import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

/** Standard response envelope from the Kritva Hono backend. */
export type ApiResponse<T = unknown> =
  | {
      data: T;
      error: null;
      meta?: {
        pagination?: {
          totalCount: number;
          limit: number;
          offset?: number;
          hasNextPage: boolean;
          nextCursor?: string;
        };
      };
    }
  | { data: null; error: { message: string; code?: string } };

/** Options for a raw fetch request — mirrors RequestInit without the body type restriction. */
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Retrieves the current Supabase session access token.
 * Returns null if no session is active (unauthenticated).
 */
async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Core fetch wrapper. Builds the full URL, injects auth header, and
 * normalises all responses (including HTTP errors) into the ApiResponse envelope.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, headers: extraHeaders, ...rest } = options;

  // Attach auth token if a session exists
  const token = await getAccessToken();
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...extraHeaders,
  };

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // Network-level failure (no internet, CORS, etc.)
    return {
      data: null,
      error: { message: "Network error. Please check your connection." },
    };
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorPayload: { message: string; code?: string } = {
      message: `Request failed with status ${response.status}`,
    };

    try {
      // Backend may return a JSON error body
      const json = await response.json();
      if (json?.error) {
        errorPayload = json.error;
      } else if (json?.message) {
        errorPayload = { message: json.message };
      }
    } catch {
      // Response body wasn't JSON — keep the default message
    }

    return { data: null, error: errorPayload };
  }

  // 204 No Content
  if (response.status === 204) {
    return { data: null as T, error: null };
  }

  try {
    const json = await response.json();
    const data: T = json?.data !== undefined ? json.data : json;
    return { data, error: null, meta: json?.meta };
  } catch {
    return { data: null, error: { message: "Failed to parse server response." } };
  }
}

/** Convenience wrappers for each HTTP method. */
export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
