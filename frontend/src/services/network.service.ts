import api from "./axios.service";

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
    const response = await api.get<NetworkInfo>("/system/network");
    return response.data;
  } catch (error) {
    console.error("Error fetching server network info:", error);
    throw error;
  }
}

export async function getPublicIP(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data: PublicIPResponse = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Error fetching public IP:", error);
    try {
      const response = await fetch("https://api.my-ip.io/ip");
      const ip = await response.text();
      return ip.trim();
    } catch (fallbackError) {
      console.error("Error with fallback IP service:", fallbackError);
      throw new Error("Unable to fetch public IP");
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
    console.error("Error fetching all IPs:", error);
    return {
      publicIP: null,
      localIPs: [],
      hostname: "",
    };
  }
}
