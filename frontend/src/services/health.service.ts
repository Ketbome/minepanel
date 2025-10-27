import api from "./axios.service";

export const healthService = async (): Promise<string> => {
  const response = await api.get(`/health`);
  return response.data;
};