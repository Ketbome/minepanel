import api from '../axios.service';

export interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorUsername: string;
  category: string;
  action: string;
  outcome: 'success' | 'error';
  serverId: string | null;
  summary: string;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: number;
  action?: string;
  outcome?: 'success' | 'error';
  serverId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLog[]> => {
  const response = await api.get('/audit', { params: filters });
  return response.data;
};
