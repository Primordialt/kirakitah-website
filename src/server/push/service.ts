import { eq } from "drizzle-orm";
import * as webpush from "web-push";
import { getDb } from "@/server/db";
import { pushSubscriptions } from "@/server/db/schema";
import {
  pushSubscriptionSchema,
  safeNotificationPath,
  type PushSubscriptionInput,
} from "@/server/push/subscription";

export class PushNotReadyError extends Error {
  constructor() {
    super("Phone alerts are not switched on for this site yet.");
    this.name = "PushNotReadyError";
  }
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      (process.env.VAPID_SUBJECT || process.env.APP_BASE_URL),
  );
}

export async function savePushSubscription(
  accountId: string,
  input: unknown,
): Promise<void> {
  const parsed = pushSubscriptionSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .insert(pushSubscriptions)
    .values({
      accountId,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        accountId,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        updatedAt: now,
      },
    });
}

export async function sendPushToAccount(
  accountId: string,
  message: { title: string; body: string; url?: string },
): Promise<number> {
  if (!isPushConfigured()) throw new PushNotReadyError();

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.APP_BASE_URL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const db = getDb();
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.accountId, accountId));

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: safeNotificationPath(message.url),
  });

  let delivered = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
      );
      delivered += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
      }
    }
  }
  return delivered;
}

export type { PushSubscriptionInput };
