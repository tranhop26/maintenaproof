import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn((config: unknown) => config) }));
vi.mock("genlayer-js", () => ({ createClient: mocks.createClient }));
vi.mock("genlayer-js/chains", () => ({ studionet: { id: 61_999 } }));

import { createSdkClient } from "@/lib/genlayer/config";

describe("browser signing configuration", () => {
  beforeEach(() => mocks.createClient.mockClear());

  it("passes the injected wallet provider with the selected account", () => {
    const provider = { request: vi.fn() };
    const account = `0x${"a".repeat(40)}` as const;

    createSdkClient(account, provider);

    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({
      account,
      provider,
    }));
  });
});
