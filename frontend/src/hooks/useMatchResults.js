import { useQuery } from "@tanstack/react-query";
import { getMatchResultsApi } from "../api/batches.js";

export const useMatchResults = (batchId, filters = {}) => {
  return useQuery({
    queryKey: ["match-results", batchId, filters],
    queryFn: () => getMatchResultsApi(batchId, filters),
    enabled: Boolean(batchId),
  });
};
