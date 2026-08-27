import api from './axios.service';

export interface NetworkInfo {
  hostname: string;
  localIPs: string[];
  publicIP: string | null;
}

export interface PublicIPResponse {
  ip: string;
}

export async function getServerNetworkInfo(): Promise<NetworkInfo> {
  try {
    const response = await api.get<NetworkInfo>('/system/network');
    return response.data;
  } catch (error) {
    console.error('Error fetching server network info:', error);
    throw error;
  }
}

export async function getPublicIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data: PublicIPResponse = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error);
    try {
      const response = await fetch('https://api.my-ip.io/ip');
      const ip = await response.text();
      return ip.trim();
    } catch (fallbackError) {
      console.error('Error with fallback IP service:', fallbackError);
      throw new Error('Unable to fetch public IP');
    }
  }
}

export async function getAllIPs(): Promise<{
  publicIP: string | null;
  localIPs: string[];
  hostname: string;
}> {
  try {
    const networkInfo = await getServerNetworkInfo();

    let publicIP: string | null = networkInfo.publicIP;
    if (!publicIP) {
      try {
        publicIP = await getPublicIP();
      } catch {
        publicIP = null;
      }
    }

    return {
      publicIP,
      localIPs: networkInfo.localIPs,
      hostname: networkInfo.hostname,
    };
  } catch (error) {
    console.error('Error fetching all IPs:', error);
    return {
      publicIP: null,
      localIPs: [],
      hostname: '',
    };
  }
}

export interface ProxyStatus {
  available: boolean;
  enabled: boolean;
  baseDomain: string | null;
  /** Host port the mc-router container publishes. */
  proxyPort?: string;
  autoScaleAvailable?: boolean;
  /** Whether the mc-router container is actually up. */
  running?: boolean;
  routesCount?: number;
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  try {
    const response = await api.get<ProxyStatus>('/proxy/status');
    return response.data;
  } catch {
    // `running` stays undefined: reporting false here would make the UI claim the
    // router is stopped when it just could not be reached.
    return { available: false, enabled: false, baseDomain: null, autoScaleAvailable: false };
  }
}

export interface ProxyMapping {
  host: string;
  backend: string;
}

export async function getProxyMappings(): Promise<ProxyMapping[]> {
  try {
    const response = await api.get<ProxyMapping[]>('/proxy/mappings');
    return response.data;
  } catch {
    return [];
  }
}

export async function getServerProxyHostname(serverId: string): Promise<string | null> {
  try {
    const response = await api.get<{ hostname: string | null }>(
      `/proxy/server/${serverId}/hostname`,
    );
    return response.data.hostname;
  } catch {
    return null;
  }
}

export async function regenerateAllDockerCompose(): Promise<{
  success: boolean;
  updated: string[];
  errors: string[];
}> {
  try {
    const response = await api.post<{ success: boolean; updated: string[]; errors: string[] }>(
      '/servers/regenerate-all',
    );
    return response.data;
  } catch {
    return { success: false, updated: [], errors: [] };
  }
}
