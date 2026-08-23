import {
  calculateAge,
  registrationSchema,
  requiresGuardian,
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
      gamerTag: "TestTag",
      game: "eFootball Mobile",
      platform: "android",
      timezone: "Africa/Lagos",
      availability: ["flexible"],
      consents: {
        rules: true,
        terms: true,
        privacy: true,
        codeOfConduct: true,
        mediaConsent: true,
      },
      eventId: "event-kg2026",
    });

    expect(result.success).toBe(false);
  });
});

describe("RegistrationForm", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ success: true, referenceId: "MOCK-123" });
  });

  it("shows validation errors for required fields", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
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

  it("shows success state after mock submission", async () => {
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Full name/i), "Test Player");
    await user.type(screen.getByLabelText(/Date of birth/i), adultDob());
    await user.selectOptions(screen.getByLabelText(/Country/i), "NG");
    await user.type(screen.getByLabelText(/City \/ location/i), "Lagos");
    await user.type(screen.getByLabelText(/^Email/i), "player@example.com");
    await user.type(screen.getByLabelText(/Phone number/i), "08012345678");
    await user.type(screen.getByLabelText(/Gamer tag/i), "TestGamer");
    await user.selectOptions(screen.getByLabelText(/Mobile platform/i), "android");
    await user.selectOptions(screen.getByLabelText(/Time zone/i), "Africa/Lagos");
    await user.click(screen.getByLabelText(/Flexible — will adapt to schedule/i));
    await user.click(screen.getByLabelText(/tournament rules/i));
    await user.click(screen.getByLabelText(/terms and conditions/i));
    await user.click(screen.getByLabelText(/privacy policy/i));
    await user.click(screen.getByLabelText(/code of conduct/i));
    await user.click(screen.getByLabelText(/media coverage/i));

    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    await waitFor(() => {
      expect(screen.getByText(/YOU'RE IN THE SYSTEM/i)).toBeInTheDocument();
    });
    expect(mockSubmit).toHaveBeenCalledOnce();
  });

  it("shows failure state when mock submission fails", async () => {
    mockSubmit.mockResolvedValueOnce({ success: false, referenceId: "" });
    render(<RegistrationForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Full name/i), "Test Player");
    await user.type(screen.getByLabelText(/Date of birth/i), adultDob());
    await user.selectOptions(screen.getByLabelText(/Country/i), "NG");
    await user.type(screen.getByLabelText(/City \/ location/i), "Lagos");
    await user.type(screen.getByLabelText(/^Email/i), "player@example.com");
    await user.type(screen.getByLabelText(/Phone number/i), "08012345678");
    await user.type(screen.getByLabelText(/Gamer tag/i), "TestGamer");
    await user.selectOptions(screen.getByLabelText(/Mobile platform/i), "android");
    await user.selectOptions(screen.getByLabelText(/Time zone/i), "Africa/Lagos");
    await user.click(screen.getByLabelText(/Flexible — will adapt to schedule/i));
    await user.click(screen.getByLabelText(/tournament rules/i));
    await user.click(screen.getByLabelText(/terms and conditions/i));
    await user.click(screen.getByLabelText(/privacy policy/i));
    await user.click(screen.getByLabelText(/code of conduct/i));
    await user.click(screen.getByLabelText(/media coverage/i));

    await user.click(screen.getByRole("button", { name: /SUBMIT APPLICATION/i }));

    await waitFor(() => {
      expect(screen.getByText(/SOMETHING WENT WRONG/i)).toBeInTheDocument();
    });
  });
});
