import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminAuthConfigured,
  assertAdminCsrf,
  getAdminAuthProvider,
  setAdminSessionCookie,
} from "@/server/admin/auth";
import { AdminAuthError } from "@/server/admin/auth/database-provider";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { apiError } from "@/server/errors";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { serverEnv } from "@/server/env";
import type { AdminRole } from "@/lib/admin-roles";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
  role: z
    .enum(["SUPER_ADMIN", "TOURNAMENT_ADMIN", "REVIEWER", "SUPPORT"])
    .optional(),
});

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    assertAdminCsrf(request);
    assertAdminAuthConfigured();

    if (serverEnv.isStrictProduction && serverEnv.adminAuthProvider === "mock") {
      return NextResponse.json(
        apiError("FORBIDDEN", "Mock admin authentication is disabled in production."),
        {
          status: 403,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(apiError("VALIDATION_ERROR", "Invalid login request."), {
        status: 400,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }

    const provider = getAdminAuthProvider();

    if (provider.providerId === "database" && !parsed.data.password) {
      return NextResponse.json(
        apiError("UNAUTHORIZED", "Invalid email or password."),
        {
          status: 401,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const user = await provider.authenticate({
      email: parsed.data.email,
      password: parsed.data.password,
      clientIp: getClientIp(request),
      role: parsed.data.role as AdminRole | undefined,
    });

    await setAdminSessionCookie(user);

    await recordAdminAuditEvent({
      eventType: "ADMIN_LOGIN_SUCCESS",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      metadata: { provider: provider.providerId },
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
      },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      await recordAdminAuditEvent({
        eventType: "ADMIN_LOGIN_FAILURE",
        requestId,
        metadata: {
          reason: error.code,
          provider: "database",
        },
      }).catch(() => undefined);

      return NextResponse.json(
        apiError(
          error.code === "RATE_LIMITED" ? "RATE_LIMITED" : "UNAUTHORIZED",
          error.message,
        ),
        {
          status: error.code === "RATE_LIMITED" ? 429 : 401,
          headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
        },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to authenticate.";

    await recordAdminAuditEvent({
      eventType: "ADMIN_LOGIN_FAILURE",
      requestId,
      metadata: { reason: "UNAUTHORIZED" },
    }).catch(() => undefined);

    return NextResponse.json(
      apiError(
        "UNAUTHORIZED",
        serverEnv.isStrictProduction
          ? "Invalid email or password."
          : message,
      ),
      {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
