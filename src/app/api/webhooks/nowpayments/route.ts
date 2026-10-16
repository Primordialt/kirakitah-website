import { NextResponse } from "next/server";
import { handleNowPaymentsIpn } from "@/server/payments/nowpayments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-nowpayments-sig");
  const result = await handleNowPaymentsIpn(rawBody, signature);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
