import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import {
  getParticipantProfile,
  ParticipantAuthenticationError,
  ParticipantProfileError,
  requireParticipantApiSession,
  updateParticipantProfile,
  assertParticipantCsrf,
} from "@/server/participant";
import { API_SECURITY_HEADERS } from "@/server/security/api";
import {
  getOrCreateRequestId,
  requestIdHeaders,
} from "@/server/security/request-id";

export const runtime = "nodejs";

const guardianSchema = z.object({
  fullName: z.string().min(1),
  relationship: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

function parseOptionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    const session = await requireParticipantApiSession(request);
    const profile = await getParticipantProfile(session.user.id);

    return NextResponse.json(
      { success: true, profile, requestId },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof ParticipantProfileError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to load profile."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}

export async function PUT(request: Request) {
  const requestId = getOrCreateRequestId(request);

  try {
    assertParticipantCsrf(request);
    const session = await requireParticipantApiSession(request);

    const contentType = request.headers.get("content-type") ?? "";
    let input: Parameters<typeof updateParticipantProfile>[1];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const identificationTypeRaw = parseOptionalString(
        formData,
        "identificationType",
      );
      const identificationType =
        identificationTypeRaw === "nin" ||
        identificationTypeRaw === "passport" ||
        identificationTypeRaw === "other_government_id"
          ? identificationTypeRaw
          : undefined;

      let guardian: z.infer<typeof guardianSchema> | null | undefined;
      const guardianRaw = parseOptionalString(formData, "guardian");
      if (guardianRaw === "" || guardianRaw === "null") {
        guardian = null;
      } else if (guardianRaw) {
        try {
          const parsedGuardian = guardianSchema.safeParse(JSON.parse(guardianRaw));
          if (!parsedGuardian.success) {
            return NextResponse.json(
              apiError("VALIDATION_ERROR", "Invalid guardian details."),
              {
                status: 400,
                headers: {
                  ...API_SECURITY_HEADERS,
                  ...requestIdHeaders(requestId),
                },
              },
            );
          }
          guardian = parsedGuardian.data;
        } catch {
          return NextResponse.json(
            apiError("VALIDATION_ERROR", "Invalid guardian details."),
            {
              status: 400,
              headers: {
                ...API_SECURITY_HEADERS,
                ...requestIdHeaders(requestId),
              },
            },
          );
        }
      }

      const photo = formData.get("playerPhoto");
      input = {
        firstName: parseOptionalString(formData, "firstName"),
        lastName: parseOptionalString(formData, "lastName"),
        dateOfBirth: parseOptionalString(formData, "dateOfBirth"),
        country: parseOptionalString(formData, "country"),
        city: parseOptionalString(formData, "city"),
        phone: parseOptionalString(formData, "phone"),
        identificationType,
        identificationNumber: parseOptionalString(
          formData,
          "identificationNumber",
        ),
        governmentIdType: parseOptionalString(formData, "governmentIdType"),
        gamerTag: parseOptionalString(formData, "gamerTag"),
        guardian,
        playerPhoto: photo instanceof File && photo.size > 0 ? photo : undefined,
      };
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          apiError("VALIDATION_ERROR", "Invalid JSON body."),
          {
            status: 400,
            headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
          },
        );
      }

      const jsonSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.string().min(1).optional(),
        country: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        identificationType: z
          .enum(["nin", "passport", "other_government_id"])
          .optional(),
        identificationNumber: z.string().min(1).optional(),
        governmentIdType: z.string().min(1).optional(),
        gamerTag: z.string().min(1).optional(),
        guardian: guardianSchema.nullable().optional(),
      });

      const parsed = jsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          apiError("VALIDATION_ERROR", "Invalid profile update."),
          {
            status: 400,
            headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
          },
        );
      }
      input = parsed.data;
    }

    const profile = await updateParticipantProfile(session.user.id, input);

    return NextResponse.json(
      { success: true, profile, requestId },
      {
        status: 200,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      return NextResponse.json(apiError("UNAUTHORIZED", error.message), {
        status: 401,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    if (error instanceof ParticipantProfileError) {
      return NextResponse.json(apiError(error.code, error.message), {
        status: error.status,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      });
    }
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Unable to update profile."),
      {
        status: 500,
        headers: { ...API_SECURITY_HEADERS, ...requestIdHeaders(requestId) },
      },
    );
  }
}
