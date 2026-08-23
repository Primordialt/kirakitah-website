import {
  createRegistrationApplication,
  DuplicateRegistrationError,
  RateLimitError,
} from "@/server/registration/create-application";
import { parseRegistrationFormData } from "@/server/registration/validation";
import { isRegistrationBackendConfigured, serverEnv } from "@/server/env";
import { apiError, type ApiErrorDetail } from "@/server/errors";
import {
  API_SECURITY_HEADERS,
  assertRegistrationBodySize,
} from "@/server/security/api";
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

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: API_SECURITY_HEADERS,
  });
}

export async function POST(request: Request) {
  if (!isRegistrationBackendConfigured()) {
    return jsonResponse(
      apiError(
        "NOT_IMPLEMENTED",
        "Registration backend is not configured for this environment.",
      ),
      503,
    );
  }

  if (!serverEnv.registrationPiiEncryptionKey) {
    return jsonResponse(
      apiError(
        "NOT_IMPLEMENTED",
        "Registration security configuration is incomplete.",
      ),
      503,
    );
  }

  if (!assertRegistrationBodySize(request.headers.get("content-length"))) {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Registration payload is too large."),
      413,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Expected multipart form data."),
      400,
    );
  }

  let parsed;
  try {
    parsed = parseRegistrationFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        apiError("VALIDATION_ERROR", "Registration validation failed.", zodErrorDetails(error)),
        400,
      );
    }
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Registration validation failed."),
      400,
    );
  }

  try {
    const result = await createRegistrationApplication(parsed, {
      clientIp: getClientIp(request),
    });

    return jsonResponse(
      {
        success: true,
        referenceId: result.referenceId,
        status: result.status,
        contactVerification: result.contactVerification,
      },
      201,
    );
  } catch (error) {
    if (error instanceof DuplicateRegistrationError) {
      return jsonResponse(apiError("CONFLICT", error.message), 409);
    }

    if (error instanceof RateLimitError) {
      return jsonResponse(apiError("RATE_LIMITED", error.message), 429);
    }

    if (serverEnv.nodeEnv === "development") {
      console.error("Registration submission failed", error);
    }

    return jsonResponse(
      apiError("INTERNAL_ERROR", "Unable to submit registration at this time."),
      500,
    );
  }
}
