import { createHash } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Canonical IPN payload from the NOWPayments Node example:
 * sort keys recursively, then JSON.stringify.
 */
export function sortIpnObject(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    const child = source[key];
    sorted[key] = child && typeof child === "object" ? sortIpnObject(child) : child;
  }
  return sorted;
}

export function ipnCanonicalJson(payload: unknown): string {
  return JSON.stringify(sortIpnObject(payload));
}

export function signIpnPayload(payload: unknown, ipnSecret: string): string {
  return createHmac("sha512", ipnSecret).update(ipnCanonicalJson(payload)).digest("hex");
}

export function verifyIpnSignature(
  payload: unknown,
  signatureHeader: string | null,
  ipnSecret: string,
): boolean {
  if (!signatureHeader || !ipnSecret) return false;
  const expected = signIpnPayload(payload, ipnSecret);
  const received = signatureHeader.trim().toLowerCase();
  if (!/^[0-9a-f]+$/i.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function ipnEventKey(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
