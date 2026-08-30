"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { MaintenaProofClient } from "@/lib/contract/client";
import { configuredContractAddress, createSdkClient } from "@/lib/genlayer/config";
import { useWallet } from "@/lib/genlayer/wallet";

export function useContractClient() {
  const wallet = useWallet();
  return useMemo(
    () => new MaintenaProofClient(
      createSdkClient(wallet.address ?? undefined),
      configuredContractAddress() as `0x${string}`,
      wallet.address ?? undefined,
    ),
    [wallet.address],
  );
}

export function useCases() {
  const client = useContractClient();
  const configured = Boolean(configuredContractAddress());
  return useQuery({
    queryKey: ["cases", configuredContractAddress()],
    queryFn: () => client.listCases(),
    enabled: configured,
  });
}

export function useCase(caseId: bigint) {
  const client = useContractClient();
  return useQuery({
    queryKey: ["case", configuredContractAddress(), caseId.toString()],
    queryFn: () => client.getCase(caseId),
    enabled: Boolean(configuredContractAddress()),
  });
}
