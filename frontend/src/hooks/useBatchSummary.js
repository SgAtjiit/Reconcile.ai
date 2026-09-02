import { useQuery } from "@tanstack/react-query";
import { getBatchSummaryApi } from "../api/batches.js";

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || "1000", 10);

export const useBatchSummary = (batchId) => {
  return useQuery({
    queryKey: ["batch-summary", batchId],
    queryFn: () => getBatchSummaryApi(batchId),
    enabled: Boolean(batchId),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.data?.status === "matching" ? POLL_INTERVAL : false;
    },
  });
};
