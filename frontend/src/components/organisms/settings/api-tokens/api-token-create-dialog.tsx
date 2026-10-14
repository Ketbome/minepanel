'use client';

import { useState } from 'react';
import { AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { TranslationKey } from '@/lib/translations';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { createApiToken, getMcpUrl, type ApiTokenExpiry, type ApiTokenPermissions, type CreatedApiToken } from '@/services/api-tokens/api-tokens.service';
import type { User } from '@/services/users/users.service';

type PermissionKey = Exclude<keyof ApiTokenPermissions, 'accessAllServers'>;

// accessAllServers is not listed: the server access section below is its only control.
const permissionLabels: Array<{ key: PermissionKey; label: TranslationKey }> = [
  { key: 'manageUsers', label: 'manageUsersPermission' },
  { key: 'viewLogs', label: 'viewLogsPermission' },
  { key: 'useConsole', label: 'useConsolePermission' },
  { key: 'viewGlobalFiles', label: 'viewGlobalFilesPermission' },
  { key: 'useGlobalFiles', label: 'manageGlobalFilesPermission' },
  { key: 'viewServerFiles', label: 'viewServerFilesPermission' },
  { key: 'useServerFiles', label: 'manageServerFilesPermission' },
  { key: 'changeServerVersion', label: 'changeServerVersionPermission' },
];

const expiryOptions = ['30', '90', '365', 'never'] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  servers: string[];
  onCreated: () => void;
};

export function ApiTokenCreateDialog({ open, onOpenChange, user, servers, onCreated }: Props) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()} className="max-h-[90vh] w-[min(96vw,44rem)] overflow-y-auto border-2 border-gray-700 bg-gray-900 text-white sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="font-minecraft text-white">{t('apiTokensCreate')}</DialogTitle>
          <DialogDescription className="text-gray-400">{t('apiTokensCreateDesc')}</DialogDescription>
        </DialogHeader>
        <ApiTokenForm user={user} servers={servers} onCreated={onCreated} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ApiTokenForm({ user, servers, onCreated, onClose }: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const { t } = useLanguage();
  const isAdmin = user.role === 'ADMIN';
  const canAllServers = isAdmin || user.access.permissions.accessAllServers;
  const available = permissionLabels.filter((permission) => isAdmin || user.access.permissions[permission.key]);

  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState<(typeof expiryOptions)[number]>('90');
  const [readOnly, setReadOnly] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [granted, setGranted] = useState<PermissionKey[]>(available.map((permission) => permission.key));
  const [allServers, setAllServers] = useState(canAllServers);
  const [serverAccess, setServerAccess] = useState<string[]>(servers);
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((current) => current !== value) : [...list, value]);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const permissions = Object.fromEntries(permissionLabels.map(({ key }) => [key, admin || granted.includes(key)])) as Record<PermissionKey, boolean>;
      const everyServer = admin || (canAllServers && allServers);
      const token = await createApiToken({
        name: name.trim(),
        admin,
        readOnly,
        permissions: { ...permissions, accessAllServers: everyServer },
        serverAccess: everyServer ? [] : serverAccess,
        expiresInDays: expiry === 'never' ? null : (Number(expiry) as ApiTokenExpiry),
      });
      setCreated(token);
      onCreated();
      mcToast.success(t('apiTokenCreated'));
    } catch (error) {
      console.error('Error creating API token:', error);
      const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
      mcToast.error(typeof message === 'string' ? message : t('apiTokenCreateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (created) {
    const mcpUrl = getMcpUrl();
    const claudeCommand = `claude mcp add --transport http minepanel ${mcpUrl} --header "Authorization: Bearer ${created.token}"`;
    const jsonConfig = JSON.stringify({ mcpServers: { minepanel: { type: 'http', url: mcpUrl, headers: { Authorization: `Bearer ${created.token}` } } } }, null, 2);

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-gray-200">{t('apiTokenSecretTitle')}</Label>
          <CopyBlock value={created.token} />
          <p className="flex items-start gap-1.5 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('apiTokenSecretWarning')}
          </p>
        </div>

        <div className="space-y-3 border-t border-gray-700/60 pt-4">
          <p className="font-minecraft text-sm text-white">{t('apiTokenMcpTitle')}</p>
          <div className="space-y-2">
            <Label className="text-gray-400">{t('apiTokenMcpClaudeCode')}</Label>
            <CopyBlock value={claudeCommand} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">{t('apiTokenMcpJson')}</Label>
            <CopyBlock value={jsonConfig} />
          </div>
          <p className="flex items-start gap-1.5 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('apiTokenAgentWarning')}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="minepanel" onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="api-token-name" className="text-gray-200">{t('name')}</Label>
          <Input id="api-token-name" value={name} maxLength={64} onChange={(event) => setName(event.target.value)} placeholder={t('apiTokenNamePlaceholder')} className="bg-gray-800 border-gray-700 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-200">{t('apiTokenExpires')}</Label>
          <Select value={expiry} onValueChange={(value) => setExpiry(value as typeof expiry)}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expiryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'never' ? t('apiTokenNoExpiry') : t('apiTokenDays').replace('{days}', option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
        <div className="pr-3">
          <p className="text-sm text-white">{t('apiTokenReadOnly')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('apiTokenReadOnlyDesc')}</p>
        </div>
        <Switch checked={readOnly} onCheckedChange={setReadOnly} />
      </div>

      {isAdmin ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
          <div className="pr-3">
            <p className="text-sm text-white">{t('apiTokenAdmin')}</p>
            <p className="mt-1 text-xs text-gray-400">{t('apiTokenAdminDesc')}</p>
          </div>
          <Switch checked={admin} onCheckedChange={setAdmin} />
        </div>
      ) : null}

      {!admin ? (
        <>
          {available.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-gray-200">{t('permissions')}</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {available.map((permission) => (
                  <div key={permission.key} className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
                    <span className="pr-3 text-sm text-gray-200">{t(permission.label)}</span>
                    <Switch checked={granted.includes(permission.key)} onCheckedChange={() => setGranted((current) => toggle(current, permission.key))} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <Label className="text-gray-200">{t('serverAccess')}</Label>
            {canAllServers ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
                <div className="pr-3">
                  <p className="text-sm text-white">{t('apiTokenAllServers')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('apiTokenAllServersDesc')}</p>
                </div>
                <Switch checked={allServers} onCheckedChange={setAllServers} />
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t('apiTokenServersHint')}</p>
            )}
            {!canAllServers || !allServers ? (
              <div className="grid gap-2 md:grid-cols-2">
                {servers.map((serverId) => (
                  <button key={serverId} type="button" onClick={() => setServerAccess((current) => toggle(current, serverId))} className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${serverAccess.includes(serverId) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700/60 bg-gray-800/40 text-gray-300'}`}>
                    {serverId}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700">
          {t('cancel')}
        </Button>
        <Button type="button" variant="minepanel" onClick={handleCreate} disabled={isSaving || !name.trim()}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('apiTokensCreate')}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CopyBlock({ value }: { value: string }) {
  const { t } = useLanguage();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      mcToast.success(t('copiedToClipboard'));
    } catch {
      mcToast.error(t('copyError'));
    }
  };

  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-xs text-gray-200">{value}</pre>
      <Button type="button" variant="minepanelOutline" size="icon" onClick={copy} aria-label={t('apiTokenCopy')} title={t('apiTokenCopy')}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
