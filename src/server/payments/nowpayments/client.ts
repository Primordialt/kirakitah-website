import { decimalField } from "@/server/payments/nowpayments/amounts";
import type { NowPaymentsConfig } from "@/server/payments/nowpayments/config";
import { NOWPAYMENTS_PAY_CURRENCY } from "@/server/payments/nowpayments/policy";

export class NowPaymentsProviderError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NowPaymentsProviderError";
    this.status = status;
  }
}

export type NowPaymentsTransport = (input: {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
}) => Promise<{ status: number; raw: string }>;

type JsonRecord = Record<string, unknown>;

let cachedToken: { value: string; expiresAt: number } | null = null;

export function resetNowPaymentsAuthCache(): void {
  cachedToken = null;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function safeProviderMessage(raw: string): string {
  const parsed = asRecord(safeJson(raw));
  const message = typeof parsed.message === "string" ? parsed.message : "Payment provider request failed.";
  return message.replace(/api[_-]?key|secret|password|token/gi, "[redacted]").slice(0, 180);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function createNowPaymentsClient(
  config: NowPaymentsConfig,
  transport: NowPaymentsTransport,
) {
  async function request(
    method: "GET" | "POST",
    path: string,
    input?: { search?: Record<string, string>; body?: unknown; bearer?: string },
  ): Promise<{ status: number; raw: string; json: unknown }> {
    if (!config.apiKey) {
      throw new NowPaymentsProviderError("NOWPayments is not configured.", 503);
    }
    const url = new URL(`${config.baseUrl}${path}`);
    for (const [key, value] of Object.entries(input?.search ?? {})) {
      url.searchParams.set(key, value);
    }
    const headers: Record<string, string> = {
      "x-api-key": config.apiKey,
      Accept: "application/json",
    };
    let body: string | undefined;
    if (input?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(input.body);
    }
    if (input?.bearer) headers.Authorization = `Bearer ${input.bearer}`;
    const response = await transport({ method, url: url.toString(), headers, body });
    if (response.status < 200 || response.status >= 300) {
      throw new NowPaymentsProviderError(safeProviderMessage(response.raw), response.status);
    }
    return { status: response.status, raw: response.raw, json: safeJson(response.raw) };
  }

  async function bearerToken(): Promise<string> {
    if (!config.email || !config.password) {
      throw new NowPaymentsProviderError("NOWPayments payout authentication is not configured.", 503);
    }
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
    const response = await transport({
      method: "POST",
      url: `${config.baseUrl}/auth`,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });
    const json = asRecord(safeJson(response.raw));
    const token = typeof json.token === "string" ? json.token : "";
    if (response.status < 200 || response.status >= 300 || !token) {
      throw new NowPaymentsProviderError("NOWPayments payout authentication failed.", response.status);
    }
    cachedToken = { value: token, expiresAt: Date.now() + 4 * 60 * 1000 };
    return token;
  }

  return {
    async getApiStatus() {
      return request("GET", "/status");
    },

    async getMinimumPaymentAmount() {
      const response = await request("GET", "/min-amount", {
        search: {
          currency_from: config.payCurrency,
          currency_to: config.payCurrency,
          fiat_equivalent: config.priceCurrency,
          is_fixed_rate: "true",
          is_fee_paid_by_user: "true",
        },
      });
      return {
        minAmount: decimalField(response.raw, "min_amount"),
        fiatEquivalent: decimalField(response.raw, "fiat_equivalent"),
      };
    },

    async getEstimate(amountDecimal: string) {
      const response = await request("GET", "/estimate", {
        search: {
          amount: amountDecimal,
          currency_from: config.priceCurrency,
          currency_to: config.payCurrency,
        },
      });
      return { estimatedAmount: decimalField(response.raw, "estimated_amount") };
    },

    async createPayment(input: { priceAmount: string; orderId: string; description: string }) {
      if (!config.ipnCallbackUrl) {
        throw new NowPaymentsProviderError("NOWPayments callback URL is not configured.", 503);
      }
      const response = await request("POST", "/payment", {
        body: {
          price_amount: input.priceAmount,
          price_currency: config.priceCurrency,
          pay_currency: config.payCurrency,
          ipn_callback_url: config.ipnCallbackUrl,
          order_id: input.orderId,
          order_description: input.description,
          is_fixed_rate: true,
          is_fee_paid_by_user: true,
        },
      });
      const json = asRecord(response.json);
      const paymentId = json.payment_id == null ? null : String(json.payment_id);
      const payAddress = typeof json.pay_address === "string" ? json.pay_address : null;
      if (!paymentId || !payAddress) {
        throw new NowPaymentsProviderError("NOWPayments did not return a deposit address.", 502);
      }
      return {
        paymentId,
        payAddress,
        payAmount: decimalField(response.raw, "pay_amount"),
        payCurrency: typeof json.pay_currency === "string" ? json.pay_currency : config.payCurrency,
        paymentStatus: typeof json.payment_status === "string" ? json.payment_status : "waiting",
        priceAmount: decimalField(response.raw, "price_amount") ?? input.priceAmount,
        network: NOWPAYMENTS_PAY_CURRENCY,
      };
    },

    async getPayment(paymentId: string) {
      const response = await request("GET", `/payment/${encodeURIComponent(paymentId)}`);
      const json = asRecord(response.json);
      const fee = asRecord(json.fee);
      return {
        paymentId: json.payment_id == null ? paymentId : String(json.payment_id),
        orderId: typeof json.order_id === "string" ? json.order_id : null,
        paymentStatus: typeof json.payment_status === "string" ? json.payment_status : "",
        payCurrency: typeof json.pay_currency === "string" ? json.pay_currency : null,
        payAmount: decimalField(response.raw, "pay_amount"),
        actuallyPaid: decimalField(response.raw, "actually_paid"),
        outcomeAmount: decimalField(response.raw, "outcome_amount"),
        outcomeCurrency: typeof json.outcome_currency === "string" ? json.outcome_currency : null,
        parentPaymentId:
          json.parent_payment_id == null || json.parent_payment_id === "null"
            ? null
            : String(json.parent_payment_id),
        priceCurrency: typeof json.price_currency === "string" ? json.price_currency : null,
        payAddress: typeof json.pay_address === "string" ? json.pay_address : null,
        feeCurrency: typeof fee.currency === "string" ? fee.currency : null,
        depositFee: decimalField(response.raw, "depositFee"),
        serviceFee: decimalField(response.raw, "serviceFee"),
      };
    },

    async validatePayoutAddress(address: string) {
      await request("POST", "/payout/validate-address", {
        body: { address, currency: config.payCurrency },
      });
    },

    async getPayoutFee(amountDecimal: string) {
      const response = await request("GET", "/payout/fee", {
        search: { currency: config.payCurrency, amount: amountDecimal },
      });
      return { fee: decimalField(response.raw, "fee") };
    },

    async createPayout(input: { address: string; amountDecimal: string; ipnCallbackUrl: string }) {
      const token = await bearerToken();
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.amountDecimal)) {
        throw new NowPaymentsProviderError("Invalid payout amount.", 400);
      }
      const response = await transport({
        method: "POST",
        url: `${config.baseUrl}/payout`,
        headers: {
          "x-api-key": config.apiKey ?? "",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: `{"withdrawals":[{"address":${JSON.stringify(input.address)},"currency":${JSON.stringify(config.payCurrency)},"amount":${input.amountDecimal},"ipn_callback_url":${JSON.stringify(input.ipnCallbackUrl)}}]}`,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new NowPaymentsProviderError(safeProviderMessage(response.raw), response.status);
      }
      const json = asRecord(safeJson(response.raw));
      const withdrawals = Array.isArray(json.withdrawals) ? json.withdrawals : [];
      const first = asRecord(withdrawals[0]);
      const payoutId = first.id == null ? (json.id == null ? null : String(json.id)) : String(first.id);
      const batchId =
        first.batch_withdrawal_id == null
          ? json.id == null
            ? null
            : String(json.id)
          : String(first.batch_withdrawal_id);
      return {
        payoutId,
        batchId,
        status: typeof first.status === "string" ? first.status : "CREATING",
      };
    },

    async verifyPayout(batchId: string, verificationCode: string) {
      const token = await bearerToken();
      await request("POST", `/payout/${encodeURIComponent(batchId)}/verify`, {
        bearer: token,
        body: { verification_code: verificationCode },
      });
    },

    async getPayout(payoutId: string) {
      const token = await bearerToken();
      const response = await request("GET", `/payout/${encodeURIComponent(payoutId)}`, {
        bearer: token,
      });
      const json = asRecord(response.json);
      return {
        payoutId: json.id == null ? payoutId : String(json.id),
        status: typeof json.status === "string" ? json.status : "",
        currency: typeof json.currency === "string" ? json.currency : null,
        amount: decimalField(response.raw, "amount"),
        address: typeof json.address === "string" ? json.address : null,
        fee: decimalField(response.raw, "fee"),
      };
    },
  };
}

export type NowPaymentsClient = ReturnType<typeof createNowPaymentsClient>;
