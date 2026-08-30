import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import type { Address, GenLayerClientPort } from "@/lib/contract/types";

export const STUDIONET_CHAIN_ID = 61_999;
export const STUDIONET_CHAIN_HEX = `0x${STUDIONET_CHAIN_ID.toString(16)}`;
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";

export interface WalletProviderPort {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
}

export function configuredContractAddress(): Address | "" {
  const value = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : "";
}

export function createSdkClient(
  account?: Address,
  injectedProvider?: WalletProviderPort,
): GenLayerClientPort {
  const provider = injectedProvider ??
    (typeof window !== "undefined" ? window.ethereum : undefined);
  return createClient({
    chain: studionet,
    ...(account ? { account } : {}),
    ...(account && provider ? { provider } : {}),
  }) as unknown as GenLayerClientPort;
}
