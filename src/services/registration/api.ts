import type {
  RegistrationFormValues,
  RegistrationResult,
} from "@/domain/registration";
import type { IRegistrationService } from "./types";

interface ApiRegistrationSuccessResponse {
  success: true;
  referenceId: string;
  status: string;
}

interface ApiRegistrationErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

function buildRegistrationFormData(
  data: RegistrationFormValues,
  options: { includeGuardian: boolean },
): FormData {
  const formData = new FormData();

  formData.append("fullName", data.fullName);
  formData.append("dateOfBirth", data.dateOfBirth);
  formData.append("country", data.country);
  formData.append("city", data.city);
  formData.append("email", data.email);
  formData.append("phone", data.phone);
  formData.append(
    "identificationType",
    data.identityVerification.identificationType,
  );
  formData.append(
    "identificationNumber",
    data.identityVerification.identificationNumber,
  );
  formData.append("gamerTag", data.gamerTag);
  formData.append("game", data.game);
  formData.append("platform", data.platform);
  if (data.gamingProfile) {
    formData.append("gamingProfile", data.gamingProfile);
  }
  formData.append("timezone", data.timezone);
  formData.append("availability", JSON.stringify(data.availability));
  formData.append("consents", JSON.stringify(data.consents));
  formData.append("eventId", data.eventId);

  const socialEntries = {
    instagram: data.socialHandles?.instagram,
    tiktok: data.socialHandles?.tiktok,
    youtube: data.socialHandles?.youtube,
  };
  const socialHandles = Object.fromEntries(
    Object.entries(socialEntries).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  if (Object.keys(socialHandles).length > 0) {
    formData.append("socialHandles", JSON.stringify(socialHandles));
  }

  if (options.includeGuardian && data.guardian) {
    formData.append("guardian", JSON.stringify(data.guardian));
  }

  formData.append("playerPhoto", data.identityVerification.playerPhoto);

  return formData;
}

export class ApiRegistrationService implements IRegistrationService {
  async submit(
    data: RegistrationFormValues,
    options: { includeGuardian: boolean },
  ): Promise<RegistrationResult> {
    const response = await fetch("/api/registrations", {
      method: "POST",
      body: buildRegistrationFormData(data, options),
    });

    const payload = (await response.json()) as
      | ApiRegistrationSuccessResponse
      | ApiRegistrationErrorResponse;

    if (!response.ok) {
      const message =
        "error" in payload
          ? payload.error.message
          : "Unable to submit registration.";
      throw new Error(message);
    }

    if (!("success" in payload) || !payload.success) {
      return { success: false, referenceId: "" };
    }

    return {
      success: true,
      referenceId: payload.referenceId,
    };
  }
}
