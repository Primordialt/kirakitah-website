import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "Endpoint must use HTTPS."),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** Notification taps stay inside KIRAKITAH. */
export function safeNotificationPath(value: unknown): string {
  if (typeof value !== "string") return "/notifications";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/notifications";
  }
  return value;
}
