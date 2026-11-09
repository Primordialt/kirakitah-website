import { WalletClient } from "./WalletClient";
import { participantFetch } from "@/lib/participant/api";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/participant/api", () => ({
  participantFetch: vi.fn(),
  apiErrorMessage: () => "Request failed.",
}));

const payload = {
  wallet: {
    balanceKk: "12",
    availableKk: "10",
    reservedKk: "2",
    usdtEquivalent: "10",
  },
  transactions: [{ signedDisplay: "+10", description: "Deposit credited", createdAt: "2026-11-09T12:00:00.000Z" }],
  deposits: [
    {
      id: "dep-1",
      amountKk: "10",
      status: "pending",
      providerStatus: "waiting",
      payAddress: "TPendingAddress",
      payAmountText: "10",
      payCurrency: "usdttrc20",
      network: "USDT TRC20",
      reviewReason: null,
      creditedKk: null,
    },
  ],
  withdrawals: [
    {
      id: "wd-1",
      amountKk: "2",
      reviewState: "pending_review",
      network: "USDT TRC20",
      providerStatus: null,
      providerFeeText: null,
      failureReason: null,
    },
  ],
  depositsEnabled: true,
  payoutsEnabled: true,
};

describe("WalletClient", () => {
  beforeEach(() => {
    vi.mocked(participantFetch).mockResolvedValue({
      response: { ok: true } as Response,
      payload,
    });
  });

  it("leads with the balance and keeps deposit, withdraw, and history lists closed", async () => {
    const user = userEvent.setup();
    render(<WalletClient />);

    expect(await screen.findByText("10")).toBeInTheDocument();
    expect(screen.getByText(/2 KK on hold/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Send USDT" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount (KK)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("TRC20 address")).not.toBeInTheDocument();
    expect(screen.getByText(/Deposit credited/)).toBeInTheDocument();
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deposit" }));
    expect(screen.getByLabelText("Amount (KK)")).toBeInTheDocument();
    expect(screen.queryByLabelText("TRC20 address")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(screen.getByLabelText("TRC20 address")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Amount (KK)")).toHaveLength(1);

    await user.click(screen.getByRole("tab", { name: "Withdrawals (1)" }));
    expect(screen.getByText(/Pending review/)).toBeInTheDocument();
    expect(screen.queryByText(/Deposit credited/)).not.toBeInTheDocument();
  });
});
