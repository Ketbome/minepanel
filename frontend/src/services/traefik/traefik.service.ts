import api from "../axios.service";

export interface TraefikStatusResponse {
  available: boolean;
  message: string;
}

export interface DomainValidationResponse {
  available: boolean;
  domain: string;
  message: string;
}

export interface TraefikConfigResponse {
  tcp?: {
    routers?: Record<string, any>;
    services?: Record<string, any>;
  };
}

export interface TraefikServersResponse {
  servers: string[];
}

export const checkTraefikStatus = async (): Promise<TraefikStatusResponse> => {
  const response = await api.get<TraefikStatusResponse>("/traefik/status");
  return response.data;
};

export const validateDomain = async (serverId: string, domain: string): Promise<DomainValidationResponse> => {
  const response = await api.post<DomainValidationResponse>(`/traefik/${serverId}/validate-domain`, { domain });
  return response.data;
};

export const getTraefikConfig = async (): Promise<TraefikConfigResponse> => {
  const response = await api.get<TraefikConfigResponse>("/traefik/config");
  return response.data;
};

export const getTraefikServers = async (): Promise<TraefikServersResponse> => {
  const response = await api.get<TraefikServersResponse>("/traefik/servers");
  return response.data;
};
