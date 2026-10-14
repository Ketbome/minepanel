'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { ApiToken } from '@/services/api-tokens/api-tokens.service';

const formatDate = (value: string) => new Date(value).toLocaleString();

export function ApiTokenList({ tokens, showOwner = false, onRevoke }: { tokens: ApiToken[]; showOwner?: boolean; onRevoke: (token: ApiToken) => Promise<void> }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<ApiToken | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const revoke = async (token: ApiToken) => {
    setRevokingId(token.id);
    try {
      await onRevoke(token);
    } finally {
      setRevokingId(null);
    }
  };

  if (tokens.length === 0) {
    return <p className="text-sm text-gray-400">{t('apiTokensEmpty')}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="px-3 py-2">{t('name')}</th>
              {showOwner ? <th className="px-3 py-2">{t('username')}</th> : null}
              <th className="px-3 py-2">{t('apiTokenScope')}</th>
              <th className="px-3 py-2">{t('apiTokenExpires')}</th>
              <th className="px-3 py-2">{t('apiTokenLastUsed')}</th>
              <th className="px-3 py-2">{t('created')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => {
              const expired = token.expiresAt !== null && new Date(token.expiresAt).getTime() < Date.now();
              const permissionCount = Object.entries(token.permissions).filter(([key, granted]) => granted && key !== 'accessAllServers').length;

              return (
                <tr key={token.id} className="border-b border-gray-800 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">{token.name}</p>
                    <p className="font-mono text-xs text-gray-500">{token.prefix}…</p>
                  </td>
                  {showOwner ? <td className="px-3 py-3 whitespace-nowrap">{token.username ?? '-'}</td> : null}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {token.readOnly ? <Badge className="bg-sky-600/20 text-sky-300">{t('apiTokenReadOnly')}</Badge> : null}
                      {token.admin ? (
                        <Badge className="bg-amber-600/20 text-amber-300">{t('admin')}</Badge>
                      ) : (
                        <>
                          <Badge className="bg-gray-700 text-gray-200">{t('apiTokenPermissionsCount').replace('{count}', String(permissionCount))}</Badge>
                          <Badge className="bg-gray-700 text-gray-200" title={token.permissions.accessAllServers ? undefined : token.serverAccess.join(', ')}>
                            {token.permissions.accessAllServers ? t('apiTokenAllServers') : t('apiTokenServersCount').replace('{count}', String(token.serverAccess.length))}
                          </Badge>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap ${expired ? 'text-red-300' : ''}`}>
                    {token.expiresAt === null ? t('never') : expired ? t('apiTokenExpired') : formatDate(token.expiresAt)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{token.lastUsedAt ? formatDate(token.lastUsedAt) : t('never')}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(token.createdAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <Button type="button" variant="minepanelDanger" size="sm" onClick={() => setPending(token)} disabled={revokingId === token.id}>
                      {revokingId === token.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {t('apiTokenRevoke')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-minecraft">{t('apiTokenRevokeTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">{t('apiTokenRevokeDesc').replace('{name}', pending?.name ?? '')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && revoke(pending)} className="bg-red-700 hover:bg-red-800 text-white border-red-900/50 font-minecraft">
              {t('apiTokenRevoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
