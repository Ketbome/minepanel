'use client';

import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/services/users/users.service';
import { UserAccessManager } from '@/components/organisms/UserAccessManager';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function AccessSettingsPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState<string>('USER');

  useEffect(() => {
    getCurrentUser().then((user) => setRole(user.role)).catch(() => setRole('USER'));
  }, []);

  if (role !== 'ADMIN') {
    return (
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('rolesAccessTitle')}</CardTitle>
              <CardDescription className="text-gray-400">{t('rolesAccessDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-300">{t('adminOnlySection')}</p>
        </CardContent>
      </Card>
    );
  }

  return <UserAccessManager />;
}
