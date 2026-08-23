import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminAuthConfigured,
  assertAdminCsrf,
  getAdminAuthProvider,
  setAdminSessionCookie,
} from "@/server/admin/auth";
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
  role: z.enum(["SUPER_ADMIN", "TOURNAMENT_ADMIN", "REVIEWER", "SUPPORT"]).optional(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    assertAdminCsrf(request);
    assertAdminAuthConfigured();

    if (serverEnv.isProduction && serverEnv.adminAuthProvider === "mock") {
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
    const user = await provider.authenticate({
      email: parsed.data.email,
      role: parsed.data.role as AdminRole | undefined,
    });

    await setAdminSessionCookie(user);

    await recordAdminAuditEvent({
      eventType: "ADMIN_LOGIN",
      actorId: user.id,
      actorRole: user.role,
      requestId,
      metadata: { provider: provider.providerId },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        requestId,
      },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to authenticate.";
    return NextResponse.json(
      apiError(
        "UNAUTHORIZED",
        serverEnv.isProduction
          ? "Admin authentication is unavailable."
          : message,
      ),
      {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
