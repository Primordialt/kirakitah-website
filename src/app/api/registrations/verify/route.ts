import { verifyContactChallenge } from "@/server/verification/contact/initiate";
import { isRegistrationBackendConfigured } from "@/server/env";
import { apiError } from "@/server/errors";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const verifySchema = z.object({
  referenceId: z.string().min(1),
  channel: z.enum(["email", "phone"]),
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(12),
});

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: API_SECURITY_HEADERS,
  });
}

/**
 * Confirms email or phone ownership using a verification challenge.
 * Frontend integration is deferred — this endpoint establishes the backend contract.
 */
export async function POST(request: Request) {
  if (!isRegistrationBackendConfigured()) {
    return jsonResponse(
      apiError("NOT_IMPLEMENTED", "Verification backend is not configured."),
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(apiError("VALIDATION_ERROR", "Expected JSON body."), 400);
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      apiError("VALIDATION_ERROR", "Invalid verification request."),
      400,
    );
  }

  const result = await verifyContactChallenge(parsed.data);

  if (!result.verified) {
    return jsonResponse(
      apiError("VALIDATION_ERROR", result.message ?? "Verification failed."),
      400,
    );
  }

  return jsonResponse({ success: true, channel: parsed.data.channel }, 200);
}
