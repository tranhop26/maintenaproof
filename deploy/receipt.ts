export interface ExecutionReceipt {
  txExecutionResultName?: string;
  consensus_data?: {
    leader_receipt?: Array<{ execution_result?: string }>;
  };
}

export function successfulExecution(receipt: ExecutionReceipt): boolean {
  const result =
    receipt.txExecutionResultName ??
    receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  return result === "SUCCESS" || result === "FINISHED_WITH_RETURN";
}
