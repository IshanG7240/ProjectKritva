/**
 * Supabase JWT authentication middleware for Hono.
 *
 * Validates the incoming `Authorization: Bearer <token>` header by verifying
 * the JWT against Supabase's public JWKS endpoint (RS256 asymmetric signing).
 * Keys are fetched once and cached automatically by `jose`.
 *
 * On success, extracts sub/email from the verified payload and binds them to
 * `c.var.user` for downstream handlers. On any failure, returns a 401 envelope.
 *
 * No shared secret is required. Uses SUPABASE_URL to locate the JWKS endpoint.
 * No role-gating or database I/O is performed here.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context, MiddlewareHandler, Next } from "hono";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal user payload extracted from a verified Supabase JWT. */
export interface AuthUser {
    /** Supabase user UUID (JWT `sub` claim). */
    id: string;
    /** User's email address (JWT `email` claim). */
    email: string;
}

/**
 * Hono variable map for typed context access.
 * Extend this interface via module augmentation if other middleware
 * need to add typed variables alongside `user`.
 */
export type AuthVariables = {
    user: AuthUser;
};

// ---------------------------------------------------------------------------
// JWKS cache
// ---------------------------------------------------------------------------

/**
 * Module-level JWKS set. jose fetches the public keys from Supabase once and
 * caches them, automatically refreshing when a new `kid` is encountered.
 * Initialised lazily so startup doesn't fail if SUPABASE_URL is set later.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** Returns (or lazily creates) the cached JWKS verifier. */
function getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!jwks) {
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error("SUPABASE_URL is not set.");
        }
        // Supabase exposes its public keys at this well-known endpoint.
        const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
        jwks = createRemoteJWKSet(jwksUrl);
    }
    return jwks;
}

// ---------------------------------------------------------------------------
// Error envelope helpers
// ---------------------------------------------------------------------------

/** Produces a 401 JSON error envelope that matches the API spec. */
function unauthorizedResponse(c: Context, message: string) {
    return c.json(
        {
            data: null,
            error: {
                code: "UNAUTHORIZED",
                message,
            },
        },
        401
    );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * `supabaseAuth` – Hono middleware factory.
 *
 * Usage:
 *   app.use("/v1/protected/*", supabaseAuth());
 *
 * The verified `AuthUser` is accessible downstream via `c.var.user`.
 */
export function supabaseAuth(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
        // 1. Read the Authorization header.
        const authHeader = c.req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return unauthorizedResponse(c, "Missing or malformed Authorization header.");
        }

        const token = authHeader.slice("Bearer ".length).trim();

        if (!token) {
            return unauthorizedResponse(c, "Bearer token is empty.");
        }

        // 2. Verify the token using Supabase's public JWKS (RS256).
        //    jwtVerify throws on invalid signature, wrong algorithm, or expiry.
        let payload: Record<string, unknown>;

        try {
            const result = await jwtVerify(token, getJwks());
            payload = result.payload as Record<string, unknown>;
        } catch (err) {
            // Config error (missing SUPABASE_URL) should be distinguishable from
            // a bad token – log it server-side but return the same 401 to clients.
            if (err instanceof Error && err.message.includes("SUPABASE_URL")) {
                console.error("[supabaseAuth]", err.message);
                return c.json(
                    {
                        data: null,
                        error: {
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Authentication service is misconfigured.",
                        },
                    },
                    500
                );
            }
            // Covers: invalid signature, expired token, wrong algorithm, malformed JWT.
            return unauthorizedResponse(c, "Token is invalid or has expired.");
        }

        // 3. Extract required claims.
        const sub = payload["sub"];
        const email = payload["email"];

        if (typeof sub !== "string" || !sub) {
            return unauthorizedResponse(c, "Token is missing the `sub` claim.");
        }

        if (typeof email !== "string" || !email) {
            return unauthorizedResponse(c, "Token is missing the `email` claim.");
        }

        // 4. Bind user identity to the Hono context for downstream handlers.
        c.set("user", { id: sub, email } satisfies AuthUser);

        await next();
    };
}
