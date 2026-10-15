'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeySquare, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ApiTokenCreateDialog } from '@/components/organisms/settings/api-tokens/api-token-create-dialog';
import { ApiTokenList } from '@/components/organisms/settings/api-tokens/api-token-list';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { getAllApiTokens, getApiTokens, revokeApiToken, type ApiToken } from '@/services/api-tokens/api-tokens.service';
import { fetchServerList } from '@/services/docker/fetchs';
import { getCurrentUser, type User } from '@/services/users/users.service';

const cardClassName = 'border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl';

export default function ApiTokensSettingsPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [allTokens, setAllTokens] = useState<ApiToken[]>([]);
  const [servers, setServers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const allowed = isAdmin || Boolean(user?.access.permissions.useApiTokens);

  const loadTokens = useCallback(async (admin: boolean) => {
    try {
      const [own, all] = await Promise.all([getApiTokens(), admin ? getAllApiTokens() : Promise.resolve([])]);
      setTokens(own);
      setAllTokens(all);
    } catch (error) {
      console.error('Error loading API tokens:', error);
      mcToast.error(t('apiTokensLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    getCurrentUser()
      .then(async (currentUser) => {
        setUser(currentUser);
        if (currentUser.role !== 'ADMIN' && !currentUser.access.permissions.useApiTokens) return;

        const [serverList] = await Promise.all([fetchServerList(), loadTokens(currentUser.role === 'ADMIN')]);
        setServers(serverList.map((server) => server.id));
      })
      .catch((error) => console.error('Error loading API tokens page:', error))
      .finally(() => setIsLoading(false));
  }, [loadTokens]);

  const handleRevoke = async (token: ApiToken) => {
    try {
      await revokeApiToken(token.id);
      mcToast.success(`${t('apiTokenRevoked')}: ${token.name}`);
      await loadTokens(isAdmin);
    } catch (error) {
      console.error('Error revoking API token:', error);
      mcToast.error(t('apiTokenRevokeFailed'));
    }
  };

  const header = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
        <KeySquare className="h-5 w-5 text-emerald-400" />
      </div>
      <div>
        <CardTitle className="text-white font-minecraft">{t('apiTokensTitle')}</CardTitle>
        <CardDescription className="text-gray-400">{t('apiTokensDesc')}</CardDescription>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardContent className="flex items-center justify-center py-10 text-gray-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('loading')}
        </CardContent>
      </Card>
    );
  }

  if (!user || !allowed) {
    return (
      <Card className={cardClassName}>
        <CardHeader>{header}</CardHeader>
        <CardContent>
          <p className="text-sm text-amber-300">{t('apiTokensNotAllowed')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {header}
            <Button type="button" variant="minepanel" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4" />
              {t('apiTokensCreate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-gray-200">{t('apiTokensYourTokens')}</Label>
          <ApiTokenList tokens={tokens} onRevoke={handleRevoke} />
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="text-white font-minecraft">{t('apiTokensAllTitle')}</CardTitle>
            <CardDescription className="text-gray-400">{t('apiTokensAllDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiTokenList tokens={allTokens} showOwner onRevoke={handleRevoke} />
          </CardContent>
        </Card>
      ) : null}

      <ApiTokenCreateDialog open={isCreating} onOpenChange={setIsCreating} user={user} servers={servers} onCreated={() => void loadTokens(isAdmin)} />
    </div>
  );
}
