import { NOWPAYMENTS_PAY_CURRENCY, NOWPAYMENTS_PRICE_CURRENCY } from "@/server/payments/nowpayments/policy";

export type NowPaymentsConfig = {
  apiKey: string | null;
  ipnSecret: string | null;
  baseUrl: string;
  ipnCallbackUrl: string | null;
  depositsEnabled: boolean;
  payoutsEnabled: boolean;
  email: string | null;
  password: string | null;
  payCurrency: string;
  priceCurrency: string;
};

function read(env: Record<string, string | undefined>, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function httpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

export function readNowPaymentsConfig(
  env: Record<string, string | undefined> = process.env,
): NowPaymentsConfig {
  const apiKey = read(env, "NOWPAYMENTS_API_KEY");
  const ipnSecret = read(env, "NOWPAYMENTS_IPN_SECRET");
  const baseUrl = (read(env, "NOWPAYMENTS_API_BASE_URL") ?? "https://api.nowpayments.io/v1").replace(
    /\/$/,
    "",
  );
  const ipnCallbackUrl = httpsUrl(read(env, "NOWPAYMENTS_IPN_CALLBACK_URL"));
  const email = read(env, "NOWPAYMENTS_AUTH_EMAIL");
  const password = read(env, "NOWPAYMENTS_AUTH_PASSWORD");
  const depositsFlag = read(env, "NOWPAYMENTS_DEPOSITS_ENABLED") === "true";
  const payoutsFlag = read(env, "NOWPAYMENTS_PAYOUTS_ENABLED") === "true";
  return {
    apiKey,
    ipnSecret,
    baseUrl,
    ipnCallbackUrl,
    depositsEnabled: Boolean(depositsFlag && apiKey && ipnSecret && ipnCallbackUrl),
    payoutsEnabled: Boolean(
      payoutsFlag && apiKey && ipnSecret && ipnCallbackUrl && email && password,
    ),
    email,
    password,
    payCurrency: NOWPAYMENTS_PAY_CURRENCY,
    priceCurrency: NOWPAYMENTS_PRICE_CURRENCY,
  };
}
