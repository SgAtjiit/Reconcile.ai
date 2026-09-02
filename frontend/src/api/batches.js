import { apiClient } from "./client.js";

export const createBatchApi = (name) => {
  return apiClient.post("/batches", { name });
};

export const uploadBatchFilesApi = (batchId, formData) => {
  return apiClient.post(`/batches/${batchId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const triggerMatchApi = (batchId) => {
  return apiClient.post(`/batches/${batchId}/match`);
};

export const getBatchSummaryApi = (batchId) => {
  return apiClient.get(`/batches/${batchId}/summary`);
};

export const getMatchResultsApi = (batchId, params = {}) => {
  return apiClient.get(`/batches/${batchId}/results`, { params });
};

export const getExceptionsApi = (batchId) => {
  return apiClient.get(`/batches/${batchId}/exceptions`);
};

export const getResultDetailApi = (resultId) => {
  return apiClient.get(`/results/${resultId}`);
};

export const rematchBatchApi = (batchId, settings) => {
  return apiClient.post(`/batches/${batchId}/rematch`, settings);
};
