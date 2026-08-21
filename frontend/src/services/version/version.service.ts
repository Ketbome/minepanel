import api from "../axios.service";

export interface ReleaseChange {
  text: string;
  author: string | null;
  pr: number | null;
  prUrl: string | null;
}

export interface ReleaseSection {
  title: string;
  important: boolean;
  changes: ReleaseChange[];
}

export interface ReleaseNote {
  version: string;
  url: string;
  publishedAt: string;
  sections: ReleaseSection[];
  notes: string;
  compareUrl: string | null;
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

export interface UpdateStatus {
  current: string | null;
  lastUpdate: UpdateResult | null;
}

export const getVersionInfo = async (): Promise<VersionInfo> => {
  const response = await api.get<VersionInfo>("/version");
  return response.data;
};

// Cheap enough to poll while the stack is being recreated, unlike /version.
export const getUpdateStatus = async (): Promise<UpdateStatus> => {
  const response = await api.get<UpdateStatus>("/version/update-status");
  return response.data;
};

export const startUpdate = async (): Promise<UpdateResult> => {
  const response = await api.post<UpdateResult>("/version/update");
  return response.data;
};
