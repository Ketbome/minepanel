'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScrollText, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getCurrentUser, getUsers, type User } from '@/services/users/users.service';
import { getAuditLogs, type AuditLog } from '@/services/audit/audit.service';
import { mcToast } from '@/lib/utils/minecraft-toast';

type Filters = {
  userId: string;
  action: string;
  outcome: '' | 'success' | 'error';
  serverId: string;
  dateFrom: string;
  dateTo: string;
};

const initialFilters: Filters = {
  userId: '',
  action: '',
  outcome: '',
  serverId: '',
  dateFrom: '',
  dateTo: '',
};

export default function AuditSettingsPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState<string>('USER');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const loadAudit = useCallback(async (nextFilters: Filters) => {
    setIsSearching(true);
    try {
      const data = await getAuditLogs({
        userId: nextFilters.userId ? Number(nextFilters.userId) : undefined,
        action: nextFilters.action.trim() || undefined,
        outcome: nextFilters.outcome || undefined,
        serverId: nextFilters.serverId.trim() || undefined,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined,
      });
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      mcToast.error(t('errorLoadingAuditLogs'));
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    Promise.all([getCurrentUser(), getUsers()])
      .then(async ([currentUser, allUsers]) => {
        setRole(currentUser.role);
        if (currentUser.role !== 'ADMIN') {
          setIsLoading(false);
          return;
        }

        setUsers(allUsers);
        await loadAudit(initialFilters);
      })
      .catch((error) => {
        console.error('Error loading audit page:', error);
        setIsLoading(false);
      });
  }, [loadAudit]);

  if (role !== 'ADMIN' && !isLoading) {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
              <ScrollText className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('auditTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('auditDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-300">{t('adminOnlySection')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/20">
              <ScrollText className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('auditTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('auditDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-gray-200">{t('username')}</Label>
              <select value={filters.userId} onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))} className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white">
                <option value="">{t('allUsers')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">{t('action')}</Label>
              <Input value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="create_invitation" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">{t('result')}</Label>
              <select value={filters.outcome} onChange={(event) => setFilters((current) => ({ ...current, outcome: event.target.value as Filters['outcome'] }))} className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white">
                <option value="">{t('allResults')}</option>
                <option value="success">{t('success')}</option>
                <option value="error">{t('error')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">{t('server')}</Label>
              <Input value={filters.serverId} onChange={(event) => setFilters((current) => ({ ...current, serverId: event.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="survival" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">{t('fromDate')}</Label>
              <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">{t('toDate')}</Label>
              <Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => loadAudit(filters)} disabled={isSearching} className="bg-cyan-600 hover:bg-cyan-700 text-white font-minecraft">
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t('filterAudit')}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setFilters(initialFilters); void loadAudit(initialFilters); }} className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700">
              {t('clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('loading')}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noAuditLogs')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="px-3 py-2">{t('date')}</th>
                    <th className="px-3 py-2">{t('username')}</th>
                    <th className="px-3 py-2">{t('action')}</th>
                    <th className="px-3 py-2">{t('result')}</th>
                    <th className="px-3 py-2">{t('server')}</th>
                    <th className="px-3 py-2">{t('summary')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-800 align-top">
                      <td className="px-3 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{log.actorUsername}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{log.action}</td>
                      <td className={`px-3 py-3 whitespace-nowrap ${log.outcome === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{log.outcome === 'success' ? t('success') : t('error')}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{log.serverId || '-'}</td>
                      <td className="px-3 py-3 min-w-[280px]">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
