import { registrationPolicy } from "@/config/registration-policy";
import {
  createRegistrationApplication,
  DuplicateRegistrationError,
  PhotoValidationError,
  RateLimitError,
} from "@/server/registration/create-application";
import { RegistrationGateError } from "@/server/registration/registration-gate";
import { parseRegistrationFormData } from "@/server/registration/validation";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import { apiError, type ApiErrorDetail } from "@/server/errors";
import {
  API_SECURITY_HEADERS,
  assertRegistrationBodySize,
} from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

function zodErrorDetails(error: ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function jsonResponse(body: unknown, status: number, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...API_SECURITY_HEADERS,
      ...requestIdHeaders(requestId),
    },
  });
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!isRegistrationBackendConfigured()) {
    return jsonResponse(
      apiError(
        "CONFIGURATION_UNAVAILABLE",
        "Registration backend is not configured for this environment.",
      ),
      503,
      requestId,
    );
  }

  if (!serverEnv.registrationPiiEncryptionKey) {
    return jsonResponse(
      apiError(
        "CONFIGURATION_UNAVAILABLE",
        "Registration security configuration is incomplete.",
      ),
      503,
      requestId,
    );
  }

  if (!assertRegistrationBodySize(request.headers.get("content-length"))) {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Registration payload is too large."),
      413,
      requestId,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Expected multipart form data."),
      400,
      requestId,
    );
  }

  let parsed;
  try {
    parsed = await parseRegistrationFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      const photoIssue = error.issues.find((issue) =>
        issue.path.join(".") === "playerPhoto",
      );
      if (photoIssue?.message.toLowerCase().includes("smaller")) {
        return jsonResponse(
          apiError("PHOTO_TOO_LARGE", photoIssue.message, zodErrorDetails(error)),
          400,
          requestId,
        );
      }
      if (photoIssue) {
        return jsonResponse(
          apiError("PHOTO_INVALID", photoIssue.message, zodErrorDetails(error)),
          400,
          requestId,
        );
      }
      return jsonResponse(
        apiError("VALIDATION_ERROR", "Registration validation failed.", zodErrorDetails(error)),
        400,
        requestId,
      );
    }
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Registration validation failed."),
      400,
      requestId,
    );
  }

  try {
    const result = await createRegistrationApplication(parsed, {
      clientIp: getClientIp(request),
      requestId,
    });

    return jsonResponse(
      {
        success: true,
        referenceId: result.referenceId,
        status: result.status,
        contactVerification: result.contactVerification,
        nextSteps: {
          applicationReceived: true,
          emailVerificationRequired:
            registrationPolicy.contactVerification === "REQUIRED",
          phoneVerificationRequired:
            registrationPolicy.contactVerification === "REQUIRED",
          contactVerificationDeferred:
            registrationPolicy.contactVerification === "DEFERRED",
          identityReview: "pending_review",
          tournamentParticipationConfirmed: false,
          registrationMode: registrationPolicy.mode,
        },
        requestId,
      },
      201,
      requestId,
    );
  } catch (error) {
    if (error instanceof RegistrationGateError) {
      return jsonResponse(apiError(error.code, error.message), error.status, requestId);
    }

    if (error instanceof DuplicateRegistrationError) {
      return jsonResponse(apiError(error.code, error.message), 409, requestId);
    }

    if (error instanceof RateLimitError) {
      return jsonResponse(apiError("RATE_LIMITED", error.message), 429, requestId);
    }

    if (error instanceof PhotoValidationError) {
      return jsonResponse(apiError(error.code, error.message), 400, requestId);
    }

    console.info(
      JSON.stringify({
        level: "error",
        event: "registration.failed",
        requestId,
        code: "INTERNAL_ERROR",
      }),
    );

    if (serverEnv.nodeEnv === "development") {
      console.error("Registration submission failed", error);
    }

    return jsonResponse(
      apiError("INTERNAL_ERROR", "Unable to submit registration at this time."),
      500,
      requestId,
    );
  }
}
