'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Save, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, confirmEmailChange, getCurrentUser, updateProfile } from '@/services/users/users.service';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { mcToast } from '@/lib/utils/minecraft-toast';

export default function AccountSettingsPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUsername(user.username);
        setEmail(user.email || '');
      })
      .catch((error) => {
        console.error('Error loading current user:', error);
        mcToast.error(t('errorLoadingServerInfo'));
      })
      .finally(() => setIsLoading(false));
  }, [t]);

  const handleUpdateProfile = async () => {
    if (!email.trim()) {
      mcToast.error(t('emailRequired'));
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const result = await updateProfile({ email });

      if (result.requiresConfirmation) {
        setPendingEmail(result.pendingEmail || email);
        setConfirmationCode('');
        mcToast.success(t('emailChangeCodeSent'));
      } else {
        setPendingEmail('');
        setEmail(result.user?.email || '');
        mcToast.success(t('emailUpdatedSuccessfully'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      mcToast.error(t('emailUpdateFailed'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleConfirmEmail = async () => {
    if (!confirmationCode.trim()) {
      mcToast.error(t('emailConfirmationCodeRequired'));
      return;
    }

    setIsConfirmingEmail(true);
    try {
      const user = await confirmEmailChange({ code: confirmationCode });
      setEmail(user.email || '');
      setPendingEmail('');
      setConfirmationCode('');
      mcToast.success(t('emailUpdatedSuccessfully'));
    } catch (error) {
      console.error('Error confirming email change:', error);
      mcToast.error(t('emailConfirmationFailed'));
    } finally {
      setIsConfirmingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      mcToast.error(t('allPasswordFieldsRequired'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      mcToast.error(t('passwordsMustMatch'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      mcToast.success(t('passwordChangedSuccessfully'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        mcToast.error(t('incorrectCurrentPassword'));
      } else {
        mcToast.error(t('passwordChangeFailed'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('accountSettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('yourUsername')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('loading')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-200">{t('username')}</Label>
                <Input id="username" value={username} disabled className="bg-gray-800/60 border-gray-700 text-gray-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">{t('email')}</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="bg-gray-800 border-gray-700 text-white" placeholder="name@example.com" />
                <p className="text-xs text-gray-500">{t('yourEmail')}</p>
              </div>
              <Button type="button" onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="bg-blue-600 hover:bg-blue-700 text-white font-minecraft">
                {isUpdatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isUpdatingProfile ? t('saving') : t('updateEmail')}
              </Button>
              {pendingEmail ? (
                <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-200">{t('pendingEmailChange')}: <span className="font-medium">{pendingEmail}</span></p>
                  <p className="text-xs text-amber-100/80">{t('emailChangeCodeSentDesc')}</p>
                  <div className="space-y-2">
                    <Label htmlFor="email-confirmation-code" className="text-gray-200">{t('emailConfirmationCode')}</Label>
                    <Input id="email-confirmation-code" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} className="bg-gray-800 border-gray-700 text-white" placeholder="123456" />
                  </div>
                  <Button type="button" onClick={handleConfirmEmail} disabled={isConfirmingEmail} className="bg-amber-600 hover:bg-amber-700 text-white font-minecraft">
                    {isConfirmingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isConfirmingEmail ? t('saving') : t('confirmEmailChange')}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-700/60 bg-gray-900/80 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20">
              <Lock className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-white font-minecraft">{t('securitySettings')}</CardTitle>
              <CardDescription className="text-gray-400">{t('securitySettingsDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              id: 'currentPassword',
              label: t('currentPassword'),
              value: passwordData.currentPassword,
              setter: (value: string) => setPasswordData((current) => ({ ...current, currentPassword: value })),
              shown: showCurrentPassword,
              toggle: () => setShowCurrentPassword((current) => !current),
            },
            {
              id: 'newPassword',
              label: t('newPassword'),
              value: passwordData.newPassword,
              setter: (value: string) => setPasswordData((current) => ({ ...current, newPassword: value })),
              shown: showNewPassword,
              toggle: () => setShowNewPassword((current) => !current),
            },
            {
              id: 'confirmPassword',
              label: t('confirmPassword'),
              value: passwordData.confirmPassword,
              setter: (value: string) => setPasswordData((current) => ({ ...current, confirmPassword: value })),
              shown: showConfirmPassword,
              toggle: () => setShowConfirmPassword((current) => !current),
            },
          ].map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="text-gray-200">{field.label}</Label>
              <div className="relative">
                <Input id={field.id} type={field.shown ? 'text' : 'password'} value={field.value} onChange={(event) => field.setter(event.target.value)} className="bg-gray-800 border-gray-700 pr-10 text-white" placeholder="••••••••" />
                <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {field.shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword} className="bg-indigo-600 hover:bg-indigo-700 text-white font-minecraft">
            {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            {isChangingPassword ? t('updatingPassword') : t('updatePassword')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
