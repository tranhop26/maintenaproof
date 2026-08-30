import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionTimeline } from "@/components/transaction-timeline";

describe("TransactionTimeline", () => {
  it("does not conflate finalization with execution success", () => {
    render(<TransactionTimeline stage="FINALIZED" />);
    expect(screen.getByText("Finalized by consensus")).toBeVisible();
    expect(screen.queryByText("Action completed")).not.toBeInTheDocument();
  });

  it("shows contract-confirmed readback only at the final stage", () => {
    render(<TransactionTimeline stage="READBACK_CONFIRMED" />);
    expect(screen.getByText("Contract readback confirmed")).toBeVisible();
  });
});
