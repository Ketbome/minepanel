import api from "../axios.service";

export interface ReleaseNote {
  version: string;
  url: string;
  publishedAt: string;
  notes: string;
  breaking: boolean;
}

export interface UpdateResult {
  status: "running" | "succeeded" | "rolled-back" | "failed";
  startedAt: string;
  finishedAt?: string;
  message?: string;
}

export interface VersionInfo {
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  publishedAt: string | null;
  changelog: ReleaseNote[];
  hasBreakingChanges: boolean;
  canSelfUpdate: boolean;
  lastUpdate: UpdateResult | null;
}

export const getVersionInfo = async (): Promise<VersionInfo> => {
  const response = await api.get<VersionInfo>("/version");
  return response.data;
};

export const startUpdate = async (): Promise<UpdateResult> => {
  const response = await api.post<UpdateResult>("/version/update");
  return response.data;
};
