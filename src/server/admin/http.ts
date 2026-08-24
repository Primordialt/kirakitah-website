import { NextResponse } from "next/server";
import { apiError, type ApiErrorCode } from "@/server/errors";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import {
  AdminAuthenticationError,
  AdminAuthorizationError,
} from "@/server/admin/authorization/permissions";
import {
  assertAdminCsrf,
  requireAdminApiSession,
} from "@/server/admin/auth";
import type { AdminPermission } from "@/server/admin/authorization/permissions";
import type { AdminSession } from "@/server/admin/auth/types";
import {
  ApplicationStatusTransitionError,
  IdentityReviewConflictError,
} from "@/server/admin/registration/transitions";
import { ParticipantSelectionError } from "@/server/tournament/participant-service";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";

export function adminJson(body: unknown, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...API_SECURITY_HEADERS,
      ...requestIdHeaders(requestId),
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function withAdminApi(
  request: Request,
  permission: AdminPermission | undefined,
  handler: (
    session: AdminSession,
    requestId: string,
  ) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(request);

  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      assertAdminCsrf(request);
    }

    const session = await requireAdminApiSession(request, permission);
    return await handler(session, requestId);
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      return adminJson(apiError("UNAUTHORIZED", error.message), 401, requestId);
    }
    if (error instanceof AdminAuthorizationError) {
      return adminJson(apiError("FORBIDDEN", error.message), 403, requestId);
    }
    if (
      error instanceof IdentityReviewConflictError ||
      error instanceof ApplicationStatusTransitionError
    ) {
      return adminJson(apiError("CONFLICT", error.message), 409, requestId);
    }
    if (error instanceof ParticipantSelectionError) {
      const code: ApiErrorCode =
        error.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : error.code === "NOT_ELIGIBLE"
            ? "VALIDATION_ERROR"
            : error.code === "CONFLICT"
              ? "CONFLICT"
              : error.code === "VALIDATION_ERROR"
                ? "VALIDATION_ERROR"
                : "INTERNAL_ERROR";
      return adminJson(
        apiError(code, error.message),
        error.status,
        requestId,
      );
    }
    if (error instanceof CompetitionOperationsError) {
      const code: ApiErrorCode =
        error.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : error.code === "FORBIDDEN"
            ? "FORBIDDEN"
            : error.code === "CONFLICT" ||
                error.code === "INVALID_TRANSITION" ||
                error.code === "CAPACITY_REACHED" ||
                error.code === "DOWNSTREAM_CONFLICT" ||
                error.code === "MATCH_REQUIRES_RESOLUTION" ||
                error.code === "PLAYER_SCHEDULE_CONFLICT"
              ? "CONFLICT"
              : error.code === "QUALIFICATION_RULES_NOT_CONFIGURED" ||
                  error.code === "KNOCKOUT_NOT_READY" ||
                  error.code === "KNOCKOUT_PAIRINGS_NOT_CONFIGURED" ||
                  error.code === "MATCH_RULES_NOT_CONFIGURED" ||
                  error.code === "VALIDATION_ERROR"
                ? "VALIDATION_ERROR"
                : "INTERNAL_ERROR";
      return adminJson(apiError(code, error.message), error.status, requestId);
    }

    const message =
      error instanceof Error ? error.message : "Admin request failed.";
    const code: ApiErrorCode =
      message.includes("notes are required") || message.includes("not found")
        ? "VALIDATION_ERROR"
        : "INTERNAL_ERROR";

    return adminJson(
      apiError(code, code === "INTERNAL_ERROR" ? "Unable to complete request." : message),
      code === "VALIDATION_ERROR" ? 400 : 500,
      requestId,
    );
  }
}
