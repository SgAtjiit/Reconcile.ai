import { useQuery } from "@tanstack/react-query";
import { getResultDetailApi } from "../api/batches.js";

export const useResultDetail = (resultId) => {
  return useQuery({
    queryKey: ["result-detail", resultId],
    queryFn: () => getResultDetailApi(resultId),
    enabled: Boolean(resultId),
  });
};
