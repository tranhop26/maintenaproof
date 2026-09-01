import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const submitServiceRecord = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/hooks/use-cases", () => ({
  useContractClient: () => ({ submitServiceRecord }),
}));

import { ServiceRecordForm } from "@/components/service-record-form";

describe("ServiceRecordForm", () => {
  it("collects structured issuer fields and never asks for an evidence URL", async () => {
    const onDone = vi.fn();
    render(<ServiceRecordForm caseId={4} nextVersion={2} onDone={onDone} />);
    expect(screen.getByLabelText(/service date/i)).toBeVisible();
    expect(screen.getByLabelText(/issued at/i)).toBeVisible();
    expect(screen.getByLabelText(/expires at/i)).toBeVisible();
    expect(screen.getByLabelText(/completed action/i)).toBeVisible();
    expect(screen.getByLabelText(/measurement name/i)).toBeVisible();
    expect(screen.getByLabelText(/attachment sha-256/i)).toBeVisible();
    expect(screen.queryByLabelText(/evidence url/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/service date/i), { target: { value: "2026-08-15" } });
    fireEvent.change(screen.getByLabelText(/issued at/i), { target: { value: "2026-08-16T10:00:00Z" } });
    fireEvent.change(screen.getByLabelText(/expires at/i), { target: { value: "2026-09-30T23:59:59Z" } });
    fireEvent.change(screen.getByLabelText(/record nonce/i), { target: { value: "record-002" } });
    fireEvent.change(screen.getByLabelText(/completed action/i), { target: { value: "replace filter" } });
    fireEvent.change(screen.getByLabelText(/measurement name/i), { target: { value: "pressure" } });
    fireEvent.change(screen.getByLabelText(/measurement value/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/measurement unit/i), { target: { value: "psi" } });
    fireEvent.change(screen.getByLabelText(/attachment uri/i), { target: { value: "ipfs://record" } });
    fireEvent.change(screen.getByLabelText(/attachment sha-256/i), { target: { value: "b".repeat(64) } });
    fireEvent.submit(screen.getByRole("button", { name: /submit signed record/i }).closest("form")!);

    await vi.waitFor(() => expect(submitServiceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 4n, version: 2n, completedActions: ["replace filter"] }),
      expect.any(Function),
    ));
  });
});
