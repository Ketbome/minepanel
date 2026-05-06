'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Shield, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { fetchServerList } from '@/services/docker/fetchs';
import {
  createInvitation,
  deleteUser,
  getInvitationLink,
  getInvitations,
  getUsers,
  updateUserAccess,
  type CreateInvitationData,
  type User,
  type UserInvitation,
  type UserPermissions,
} from '@/services/users/users.service';

const emptyPermissions: UserPermissions = {
  manageUsers: false,
  accessAllServers: false,
  viewLogs: false,
  useConsole: false,
  viewGlobalFiles: false,
  useGlobalFiles: false,
  viewServerFiles: false,
  useServerFiles: false,
};

const fullPermissions: UserPermissions = {
  manageUsers: true,
  accessAllServers: true,
  viewLogs: true,
  useConsole: true,
  viewGlobalFiles: true,
  useGlobalFiles: true,
  viewServerFiles: true,
  useServerFiles: true,
};

const permissionLabels: Array<{ key: keyof UserPermissions; label: string }> = [
  { key: 'manageUsers', label: 'manageUsersPermission' },
  { key: 'accessAllServers', label: 'accessAllServers' },
  { key: 'viewLogs', label: 'viewLogsPermission' },
  { key: 'useConsole', label: 'useConsolePermission' },
  { key: 'viewGlobalFiles', label: 'viewGlobalFilesPermission' },
  { key: 'useGlobalFiles', label: 'manageGlobalFilesPermission' },
  { key: 'viewServerFiles', label: 'viewServerFilesPermission' },
  { key: 'useServerFiles', label: 'manageServerFilesPermission' },
];

type EditableUser = User & {
  isSaving?: boolean;
  isDeleting?: boolean;
};

export function UserAccessManager() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [serverIds, setServerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [copyingInvitationId, setCopyingInvitationId] = useState<number | null>(null);
  const [copiedInvitationId, setCopiedInvitationId] = useState<number | null>(null);
  const [inviteForm, setInviteForm] = useState<CreateInvitationData>({
    email: '',
    permissions: emptyPermissions,
    serverAccess: [],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userList, inviteList, servers] = await Promise.all([getUsers(), getInvitations(), fetchServerList()]);
      setUsers(userList.map((user) => ({ ...user })));
      setInvitations(inviteList);
      setServerIds(servers.map((server) => server.id));
    } catch (error) {
      console.error('Error loading user access manager:', error);
      mcToast.error(t('errorLoadingServerInfo'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleServer = (currentServers: string[], serverId: string) => {
    return currentServers.includes(serverId)
      ? currentServers.filter((current) => current !== serverId)
      : [...currentServers, serverId];
  };

  const updateLocalUser = (userId: number, updater: (user: EditableUser) => EditableUser) => {
    setUsers((current) => current.map((user) => (user.id === userId ? updater(user) : user)));
  };

  const hasAllPermissions = (permissions: UserPermissions) => Object.values(permissions).every(Boolean);

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      await createInvitation({
        ...inviteForm,
        email: inviteForm.email?.trim() || undefined,
        serverAccess: inviteForm.permissions.accessAllServers ? [] : inviteForm.serverAccess,
      });
      setInviteForm({
        email: '',
        permissions: emptyPermissions,
        serverAccess: [],
      });
      await loadData();
      mcToast.success(t('invitationCreated'));
    } catch (error) {
      console.error('Error creating invitation:', error);
      mcToast.error(t('invitationCreateFailed'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInvitation = async (invitationId: number) => {
    setCopyingInvitationId(invitationId);
    try {
      const { inviteUrl } = await getInvitationLink(invitationId);
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvitationId(invitationId);
      mcToast.success(t('copiedToClipboard'));
      window.setTimeout(() => {
        setCopiedInvitationId((current) => (current === invitationId ? null : current));
      }, 1500);
    } catch (error) {
      console.error('Error copying invitation link:', error);
      mcToast.error(t('copyError'));
      await loadData();
    } finally {
      setCopyingInvitationId(null);
    }
  };

  const handleSaveUser = async (user: EditableUser) => {
    updateLocalUser(user.id, (current) => ({ ...current, isSaving: true }));
    try {
      const updatedUser = await updateUserAccess(user.id, {
        isActive: user.isActive,
        permissions: user.access.permissions,
        serverAccess: user.access.permissions.accessAllServers ? [] : user.access.serverAccess,
      });
      updateLocalUser(user.id, () => ({ ...updatedUser }));
      mcToast.success(`${t('saveAccess')}: ${updatedUser.username}`);
    } catch (error) {
      console.error('Error updating user access:', error);
      updateLocalUser(user.id, (current) => ({ ...current, isSaving: false }));
      mcToast.error(t('settingsSaveFailed'));
    }
  };

  const handleDeleteUser = async (user: EditableUser) => {
    updateLocalUser(user.id, (current) => ({ ...current, isDeleting: true }));
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((currentUser) => currentUser.id !== user.id));
      mcToast.success(`${t('deleteUserAction')}: ${user.username}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      updateLocalUser(user.id, (current) => ({ ...current, isDeleting: false }));
      mcToast.error(t('unexpectedError'));
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardContent className="flex items-center justify-center py-10 text-gray-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('loadingAccessControls')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('userInvitationsTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('userInvitationsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-gray-200">{t('email')}</Label>
            <Input id="invite-email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="name@example.com" />
          </div>

          <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
            <p className="text-sm text-white">{t('sendInvitationEmail')}</p>
            <p className="mt-1 text-xs text-gray-400">{t('sendInvitationEmailDesc')}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
            <div>
              <p className="text-sm text-white">{t('grantAllPermissions')}</p>
              <p className="mt-1 text-xs text-gray-400">{t('grantAllPermissionsDesc')}</p>
            </div>
            <Switch checked={hasAllPermissions(inviteForm.permissions)} onCheckedChange={(checked) => setInviteForm((current) => ({ ...current, permissions: checked ? fullPermissions : emptyPermissions, serverAccess: checked ? [] : current.serverAccess }))} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {permissionLabels.map((permission) => (
              <div key={permission.key} className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3">
                <span className="text-sm text-gray-200">{t(permission.label as never)}</span>
                <Switch checked={inviteForm.permissions[permission.key]} onCheckedChange={(checked) => setInviteForm((current) => ({ ...current, permissions: { ...current.permissions, [permission.key]: checked }, serverAccess: permission.key === 'accessAllServers' && checked ? [] : current.serverAccess }))} />
              </div>
            ))}
          </div>

          {!inviteForm.permissions.accessAllServers ? (
            <div className="space-y-3">
              <Label className="text-gray-200">{t('serverAccess')}</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {serverIds.map((serverId) => (
                  <button key={serverId} type="button" onClick={() => setInviteForm((current) => ({ ...current, serverAccess: toggleServer(current.serverAccess, serverId) }))} className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${inviteForm.serverAccess.includes(serverId) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700/60 bg-gray-800/40 text-gray-300'}`}>
                    {serverId}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button type="button" onClick={handleInvite} disabled={isInviting} className="bg-amber-600 hover:bg-amber-700 text-white font-minecraft">
            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('createInvitation')}
          </Button>

          <div className="space-y-2">
            <Label className="text-gray-200">{t('pendingInvitations')}</Label>
            {invitations.length === 0 ? <p className="text-sm text-gray-400">{t('noPendingInvitations')}</p> : null}
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-3 text-sm text-gray-300">
                <div>
                  <div className="font-medium text-white">{invitation.email || t('invitationLinkOnly')}</div>
                  <div>{t('invitationExpires')}: {new Date(invitation.expiresAt).toLocaleString()}</div>
                </div>
                <Button type="button" variant="outline" onClick={() => handleCopyInvitation(invitation.id)} disabled={copyingInvitationId === invitation.id} className="border-gray-700 bg-gray-900 text-gray-100 hover:bg-gray-800">
                  {copyingInvitationId === invitation.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : copiedInvitationId === invitation.id ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {t('copyLink')}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-white font-minecraft">{t('existingUsersTitle')}</CardTitle>
          <CardDescription className="text-gray-400">{t('existingUsersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="space-y-3">
            {users.map((user) => (
              <AccordionItem key={user.id} value={`user-${user.id}`} className="overflow-hidden rounded-xl border border-gray-700/60 bg-gray-800/40">
                <AccordionTrigger className="px-4 py-4 text-left hover:bg-gray-800/60">
                  <div className="flex flex-1 flex-col gap-1 pr-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-white">{user.username}</p>
                      <p className="text-sm text-gray-400">{user.email || t('noEmailAssigned')} · {user.role}</p>
                    </div>
                    <span className={`text-sm ${user.isActive ? 'text-emerald-300' : 'text-red-300'}`}>{user.isActive ? t('activeUser') : t('inactiveUser')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pb-4 pt-1">
                  {user.role === 'ADMIN' ? (
                    <p className="text-sm text-amber-300">{t('adminAccessUnrestricted')}</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-200">{t('grantAllPermissions')}</p>
                          <p className="mt-1 text-xs text-gray-500">{t('grantAllPermissionsDesc')}</p>
                        </div>
                        <Switch checked={hasAllPermissions(user.access.permissions)} onCheckedChange={(checked) => updateLocalUser(user.id, (current) => ({ ...current, access: { ...current.access, permissions: checked ? fullPermissions : emptyPermissions, serverAccess: checked ? [] : current.access.serverAccess } }))} />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-4 py-3">
                        <span className="text-sm text-gray-200">{t('activeUser')}</span>
                        <Switch checked={user.isActive} onCheckedChange={(checked) => updateLocalUser(user.id, (current) => ({ ...current, isActive: checked }))} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {permissionLabels.map((permission) => (
                          <div key={permission.key} className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/40 px-4 py-3">
                            <span className="text-sm text-gray-200">{t(permission.label as never)}</span>
                            <Switch checked={user.access.permissions[permission.key]} onCheckedChange={(checked) => updateLocalUser(user.id, (current) => ({ ...current, access: { ...current.access, permissions: { ...current.access.permissions, [permission.key]: checked }, serverAccess: permission.key === 'accessAllServers' && checked ? [] : current.access.serverAccess } }))} />
                          </div>
                        ))}
                      </div>

                      {!user.access.permissions.accessAllServers ? (
                        <div className="space-y-3">
                          <Label className="text-gray-200">{t('serverAccess')}</Label>
                          <div className="grid gap-2 md:grid-cols-2">
                            {serverIds.map((serverId) => (
                              <button key={serverId} type="button" onClick={() => updateLocalUser(user.id, (current) => ({ ...current, access: { ...current.access, serverAccess: toggleServer(current.access.serverAccess, serverId) } }))} className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${user.access.serverAccess.includes(serverId) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700/60 bg-gray-900/40 text-gray-300'}`}>
                                {serverId}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => handleSaveUser(user)} disabled={user.isSaving} className="rounded-xl border border-emerald-400/40 bg-linear-to-b from-emerald-500 to-emerald-700 font-minecraft text-white shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] hover:from-emerald-400 hover:to-emerald-600 hover:shadow-emerald-900/50 active:scale-[0.98] disabled:scale-100 disabled:opacity-60">
                          {user.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {t('saveAccess')}
                        </Button>
                        <Button type="button" onClick={() => handleDeleteUser(user)} disabled={user.isDeleting} className="rounded-xl border border-red-500/40 bg-linear-to-b from-red-500 to-red-700 font-minecraft text-white shadow-lg shadow-red-950/40 transition-all hover:scale-[1.02] hover:from-red-400 hover:to-red-600 hover:shadow-red-900/50 active:scale-[0.98] disabled:scale-100 disabled:opacity-60">
                          {user.isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {t('deleteUserAction')}
                        </Button>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
