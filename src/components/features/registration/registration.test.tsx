import {
  calculateAge,
  registrationSchema,
  requiresGuardian,
  toRegistrationSubmission,
} from "@/domain/registration";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RegistrationForm } from "@/components/features/registration/RegistrationForm";

const mockSubmit = vi.fn();

vi.mock("@/services", () => ({
  services: {
    registration: {
      submit: (...args: unknown[]) => mockSubmit(...args),
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function adultDob() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 25);
  return date.toISOString().slice(0, 10);
}

function minorDob() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 15);
  return date.toISOString().slice(0, 10);
}

function underageDob() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 8);
  return date.toISOString().slice(0, 10);
}

function createTestFile(name: string, type: string, content = "test-content") {
  return new File([content], name, { type });
}

async function fillRequiredRegistrationFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full name/i), "Test Player");
  await user.type(screen.getByLabelText(/Date of birth/i), adultDob());
  await user.selectOptions(screen.getByLabelText(/Country/i), "NG");
  await user.type(screen.getByLabelText(/City \/ location/i), "Lagos");
  await user.type(screen.getByLabelText(/^Email/i), "player@example.com");
  await user.type(screen.getByLabelText(/Phone number/i), "08012345678");

  await user.selectOptions(
    screen.getByLabelText(/Identification type/i),
    "nin",
  );
  await user.type(
    await screen.findByPlaceholderText("Enter your NIN"),
    "12345678901",
  );

  const playerPhotoInput = screen.getByLabelText(/Player photo/i);
  await user.upload(playerPhotoInput, createTestFile("player-photo.jpg", "image/jpeg"));

  await user.type(screen.getByLabelText(/Gamer Tag/i), "TestGamer");
  await user.type(screen.getByLabelText(/Instagram username/i), "test_ig");
  await user.type(screen.getByLabelText(/TikTok username/i), "test_tt");
  await user.type(
    screen.getByLabelText(/YouTube handle \/ channel name/i),
    "test_yt",
  );
  await user.click(
    screen.getByLabelText(/I confirm that I follow KIRAKITAH on all official social platforms/i),
  );
  await user.selectOptions(screen.getByLabelText(/Mobile platform/i), "android");
  await user.selectOptions(screen.getByLabelText(/Time zone/i), "Africa/Lagos");
  await user.click(screen.getByLabelText(/Flexible — will adapt to schedule/i));
  await user.click(screen.getByLabelText(/tournament rules/i));
  await user.click(screen.getByLabelText(/terms and conditions/i));
  await user.click(screen.getByLabelText(/privacy policy/i));
  await user.click(screen.getByLabelText(/code of conduct/i));
  await user.click(screen.getByLabelText(/media coverage/i));
}

describe("registration domain", () => {
  it("calculates age accounting for birthday", () => {
    const today = new Date();
    const futureBirthday = new Date(
      today.getFullYear() - 20,
      today.getMonth() + 1,
      today.getDate(),
    );
    expect(calculateAge(futureBirthday.toISOString().slice(0, 10))).toBe(19);
  });

  it("requires guardian for minors aged 10-17", () => {
    expect(requiresGuardian(minorDob())).toBe(true);
    expect(requiresGuardian(adultDob())).toBe(false);
  });

  it("rejects participants under 10", () => {
    const result = registrationSchema.safeParse({
      fullName: "Test Player",
      dateOfBirth: underageDob(),
      country: "NG",
      city: "Lagos",
      email: "test@example.com",
      phone: "1234567890",
      identityVerification: {
        identificationType: "nin",
        identificationNumber: "12345678901",
        playerPhoto: createTestFile("photo.jpg", "image/jpeg"),
      },
      gamerTag: "TestTag",
      game: "eFootball Mobile",
      platform: "android",
      timezone: "Africa/Lagos",
      availability: ["flexible"],
      socialHandles: {
        instagram: "test_ig",
        tiktok: "test_tt",
        youtube: "test_yt",
      },
      socialFollowAttestation: true,
      consents: {
        rules: true,
        terms: true,
        privacy: true,
        codeOfConduct: true,
        mediaConsent: true,
      },
      eventId: "event-kg926",
    });

    expect(result.success).toBe(false);
  });

  it("normalizes identification number and strips player photo to metadata", () => {
    const payload = toRegistrationSubmission(
      {
        fullName: "Test Player",
        dateOfBirth: adultDob(),
        country: "NG",
        city: "Lagos",
        email: "test@example.com",
        phone: "1234567890",
        identityVerification: {
          identificationType: "nin",
          identificationNumber: "123 4567 8901",
          playerPhoto: createTestFile("photo.jpg", "image/jpeg"),
        },
        gamerTag: "TestTag",
        game: "eFootball Mobile",
        platform: "android",
        gamingProfile: "",
        timezone: "Africa/Lagos",
        availability: ["flexible"],
        socialHandles: {
          instagram: "test_ig",
          tiktok: "test_tt",
          youtube: "test_yt",
        },
        socialFollowAttestation: true,
        consents: {
          rules: true,
          terms: true,
          privacy: true,
          codeOfConduct: true,
          mediaConsent: true,
        },
        eventId: "event-kg926",
      },
      { includeGuardian: false },
    );

    expect(payload.identityVerification.identificationType).toBe("nin");
    expect(payload.identityVerification.identificationNumber).toBe("12345678901");
    expect(payload.identityVerification.playerPhoto).toEqual({
      fileName: "photo.jpg",
      fileSize: payload.identityVerification.playerPhoto.fileSize,
      mimeType: "image/jpeg",
    });
    expect(Object.keys(payload.identityVerification.playerPhoto)).toEqual([
      "fileName",
      "fileSize",
      "mimeType",
    ]);
  });
});

describe("RegistrationForm", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ success: true, referenceId: "MOCK-123" });
  });

  it("clarifies that Gamer Tag is the eFootball username", () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText(/Gamer Tag/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Your eFootball username \/ gamer tag/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter your eFootball username/i),
    ).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
    expect(await screen.findByText("Identification type is required")).toBeInTheDocument();
    expect(await screen.findByText("Player photo is required")).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("shows guardian fields for minors and hides for adults", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Date of birth/i), minorDob());
    await user.tab();

    expect(
      screen.getByRole("group", { name: /PARENT \/ GUARDIAN INFORMATION/i }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Date of birth/i));
    await user.type(screen.getByLabelText(/Date of birth/i), adultDob());
    await user.tab();

    expect(
      screen.queryByRole("group", { name: /PARENT \/ GUARDIAN INFORMATION/i }),
    ).not.toBeInTheDocument();
  });

  it("updates identification number label when type changes", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/Identification type/i), "passport");

    expect(await screen.findByLabelText(/Passport number/i)).toBeInTheDocument();
  });

  it("shows success state after mock submission", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await fillRequiredRegistrationFields(user);
    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    await waitFor(() => {
      expect(screen.getByText(/APPLICATION RECEIVED/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Thank you for submitting your KIRAKITAH GAMING 926 application/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Contact verification will follow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/YOU'RE IN THE SYSTEM/i)).not.toBeInTheDocument();

    expect(mockSubmit).toHaveBeenCalledOnce();
    const [submitted, options] = mockSubmit.mock.calls[0];
    expect(submitted.identityVerification.identificationType).toBe("nin");
    expect(submitted.identityVerification.identificationNumber).toBe("12345678901");
    expect(submitted.identityVerification.playerPhoto).toBeInstanceOf(File);
    expect(options).toEqual({ includeGuardian: false });
  }, 15000);

  it("shows failure state when mock submission fails", async () => {
    mockSubmit.mockResolvedValueOnce({ success: false, referenceId: "" });
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await fillRequiredRegistrationFields(user);
    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    await waitFor(() => {
      expect(screen.getByText(/SOMETHING WENT WRONG/i)).toBeInTheDocument();
    });
  }, 15000);
});
