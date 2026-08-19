import api from "../axios.service";

export interface VersionInfo {
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  publishedAt: string | null;
}

export const getVersionInfo = async (): Promise<VersionInfo> => {
  const response = await api.get<VersionInfo>("/version");
  return response.data;
};
