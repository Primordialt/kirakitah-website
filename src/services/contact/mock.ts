import type {
  ContactFormValues,
  ContactSubmissionResult,
} from "@/domain/contact";

const SPAM_PATTERNS = [/viagra/i, /casino/i, /http:\/\//i];

export class MockContactService {
  async submit(data: ContactFormValues): Promise<ContactSubmissionResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (data.email === "fail@kirakitah.test") {
      return {
        success: false,
        message: "Unable to send your message. Please try again later.",
      };
    }

    if (SPAM_PATTERNS.some((pattern) => pattern.test(data.message))) {
      return {
        success: false,
        message: "Your message could not be sent.",
      };
    }

    const referenceId = `KK-MSG-${Date.now().toString(36).toUpperCase()}`;

    return { success: true, referenceId };
  }
}

export const mockContactService = new MockContactService();
