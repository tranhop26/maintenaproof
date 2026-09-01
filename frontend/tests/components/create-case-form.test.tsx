import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  wallet: { isConnected: false, isCorrectNetwork: false },
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/hooks/use-cases", () => ({
  useContractClient: () => ({ createCase: vi.fn() }),
}));
vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => mocks.wallet }));

import { CreateCaseForm } from "@/components/create-case-form";

describe("CreateCaseForm wallet gates", () => {
  beforeEach(() => {
    mocks.wallet.isConnected = false;
    mocks.wallet.isCorrectNetwork = false;
  });

  it("does not expose a write while disconnected", () => {
    render(<CreateCaseForm />);
    expect(screen.getByText("Connect wallet to create a case")).toBeVisible();
    expect(screen.queryByRole("button", { name: /create immutable case/i })).toBeNull();
  });

  it("requires Studionet before exposing the form", () => {
    mocks.wallet.isConnected = true;
    render(<CreateCaseForm />);
    expect(screen.getByText(/switch.*studionet/i)).toBeVisible();
  });

  it("binds separate issuer/provider wallets and has no mutable evidence host", () => {
    mocks.wallet.isConnected = true;
    mocks.wallet.isCorrectNetwork = true;
    render(<CreateCaseForm />);
    expect(screen.getByLabelText(/issuer wallet/i)).toBeVisible();
    expect(screen.getByLabelText(/provider wallet/i)).toBeVisible();
    expect(screen.queryByLabelText(/evidence hostname/i)).toBeNull();
    expect(screen.getByText(/issuer wallet signs each service record/i)).toBeVisible();
  });
});
