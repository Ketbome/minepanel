import api from '../axios.service';

export interface SftpStatus {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
}

export const getSftpStatus = async (serverId: string): Promise<SftpStatus> => {
    const response = await api.get(`/server-management/servers/${serverId}/sftp/status`);
    return response.data;
};

export const enableSftp = async (serverId: string): Promise<SftpStatus> => {
    const response = await api.post(`/server-management/servers/${serverId}/sftp/enable`);
    return response.data;
};

export const disableSftp = async (serverId: string): Promise<SftpStatus> => {
    const response = await api.post(`/server-management/servers/${serverId}/sftp/disable`);
    return response.data;
};
