'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mcToast } from '@/lib/utils/minecraft-toast';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  acceptInvitation,
  getInvitation,
  getSetupStatus,
  isAuthenticated,
  login,
  requestPasswordReset,
  resetPassword,
  setupAdmin,
  startSsoLogin,
  type SetupStatus,
} from '@/services/auth/auth.service';
import type { UserInvitation } from '@/services/users/users.service';
import { healthService } from '@/services/health.service';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { GitHubStarButton } from '@/components/molecules/GitHubStarButton';
import { ConnectionErrorDialog } from '@/components/ui/connection-error-dialog';
import { LINK, LINK_DOCUMENTATION, LINK_GITHUB } from '@/lib/providers/constants';

type AuthView = 'login' | 'setup' | 'forgot' | 'reset' | 'invite';

const getErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: {
      data?: {
        message?: string | string[];
      };
    };
  };

  const message = err.response?.data?.message;
  if (Array.isArray(message)) {
    return message[0] || 'Unexpected error';
  }

  return message || 'Unexpected error';
};

function HomeContent() {
  const [view, setView] = useState<AuthView>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('resetToken');
  const inviteToken = searchParams.get('inviteToken');
  const ssoError = searchParams.get('ssoError');
  const { t } = useLanguage();

  const sso = setupStatus?.sso;
  const ssoEnabled = !!sso?.enabled;
  const passwordLoginDisabled = !!sso?.passwordLoginDisabled;

  const changeView = useCallback((nextView: AuthView) => {
    setView(nextView);
    setPassword('');
    setConfirmPassword('');

    if (nextView === 'login') {
      setEmail('');
      setUsername('');
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        router.push('/dashboard/home');
        return;
      }

      try {
        const status = await getSetupStatus();
        setSetupStatus(status);

        if (status.requiresSetup) {
          // With SSO-only the first admin is bootstrapped on the first SSO login.
          setView(status.sso?.passwordLoginDisabled ? 'login' : 'setup');
          return;
        }

        if (inviteToken) {
          const invite = await getInvitation(inviteToken);
          setInvitation(invite);
          setEmail(invite.email || '');
          setView('invite');
          return;
        }

        setView(resetToken ? 'reset' : 'login');
      } catch (error) {
        console.error('Error checking setup status:', error);
        setSetupStatus({ requiresSetup: false, passwordRecoveryEnabled: false });
        setView(resetToken ? 'reset' : 'login');
      }
    };

    initialize();
  }, [inviteToken, resetToken, router]);

  useEffect(() => {
    if (ssoError) {
      mcToast.error(t('ssoError'));
      router.replace('/');
    }
  }, [ssoError, router, t]);

  const checkHealth = useCallback(async () => {
    try {
      await healthService();
      setServerAvailable(true);
      setShowErrorDialog(false);
    } catch (err) {
      console.error('Error:', err);
      setServerAvailable(false);
      setShowErrorDialog(true);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleLogin = async () => {
    const result = await login(identifier, password);

    if (result.success) {
      mcToast.success(t('loginSuccess'));
      router.push('/dashboard/home');
      return;
    }

    mcToast.error(typeof result.error === 'string' ? result.error : t('invalidCredentials'));
  };

  const handleSetup = async () => {
    if (password !== confirmPassword) {
      mcToast.error(t('passwordsMustMatch'));
      return;
    }

    const result = await setupAdmin({ username, email, password });
    if (result.success) {
      mcToast.success(t('setupComplete'));
      router.push('/dashboard/home');
      return;
    }

    mcToast.error(typeof result.error === 'string' ? result.error : t('setupError'));
  };

  const handleForgotPassword = async () => {
    await requestPasswordReset(email);
    mcToast.success(t('passwordResetLinkSent'));
    changeView('login');
  };

  const handleResetPassword = async () => {
    if (!resetToken) {
      mcToast.error(t('invalidResetToken'));
      return;
    }

    if (password !== confirmPassword) {
      mcToast.error(t('passwordsMustMatch'));
      return;
    }

    await resetPassword(resetToken, password);
    mcToast.success(t('passwordResetSuccess'));
    router.replace('/');
    changeView('login');
  };

  const handleAcceptInvitation = async () => {
    if (!inviteToken) {
      mcToast.error(t('invalidInvitationToken'));
      return;
    }

    if (password !== confirmPassword) {
      mcToast.error(t('passwordsMustMatch'));
      return;
    }

    await acceptInvitation({
      token: inviteToken,
      username,
      password,
      email: invitation?.email ? undefined : email,
    });

    mcToast.success(t('invitationAccepted'));
    router.push('/dashboard/home');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (view === 'login') {
        await handleLogin();
      }

      if (view === 'setup') {
        await handleSetup();
      }

      if (view === 'forgot') {
        await handleForgotPassword();
      }

      if (view === 'reset') {
        await handleResetPassword();
      }

      if (view === 'invite') {
        await handleAcceptInvitation();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      mcToast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || !serverAvailable;

  const getCardTitle = () => {
    if (view === 'setup') return t('finishInitialSetup');
    if (view === 'forgot') return t('forgotPassword');
    if (view === 'reset') return t('resetPassword');
    if (view === 'invite') return t('acceptInvitation');
    return t('login');
  };

  const getCardDescription = () => {
    if (view === 'setup') return t('finishInitialSetupDescription');
    if (view === 'forgot') return t('forgotPasswordDescription');
    if (view === 'reset') return t('resetPasswordDescription');
    if (view === 'invite') return t('acceptInvitationDesc');
    return t('enterCredentials');
  };

  const getSubmitLabel = () => {
    if (serverAvailable === null) {
      return t('checkingServerStatus');
    }

    if (isLoading) {
      return t('loading');
    }

    if (!serverAvailable) {
      return t('serverUnavailable');
    }

    if (view === 'setup') return t('createAdminAccount');
    if (view === 'forgot') return t('sendPasswordResetLink');
    if (view === 'reset') return t('resetPassword');
    if (view === 'invite') return t('createAccount');
    return t('enterServer');
  };

  return (
    <>
      <ConnectionErrorDialog isOpen={showErrorDialog} onRetry={checkHealth} />
      <div className="relative flex min-h-screen flex-col overflow-hidden mp-blueprint">

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <m.div
            animate={{ y: [0, -20, 0], x: [0, 10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-10 top-20 opacity-20"
          >
            <Image src="/images/grass.webp" alt="" width={60} height={60} />
          </m.div>
          <m.div
            animate={{ y: [0, 20, 0], x: [0, -15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute right-20 top-40 opacity-20"
          >
            <Image src="/images/diamond.webp" alt="" width={50} height={50} />
          </m.div>
          <m.div
            animate={{ y: [0, -25, 0], x: [0, 12, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-32 left-1/4 opacity-15"
          >
            <Image src="/images/grass.webp" alt="" width={45} height={45} />
          </m.div>
          <m.div
            animate={{ y: [0, 18, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute bottom-20 right-1/4 opacity-15"
          >
            <Image src="/images/diamond.webp" alt="" width={55} height={55} />
          </m.div>
        </div>

        <header className="relative z-10 mc-titlebar bg-[var(--mc-stone)]/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
            <Link href="/" className="group flex items-center gap-3 font-bold">
              <m.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                <Image
                  src="/images/minecraft-logo.webp"
                  alt="Minecraft Logo"
                  width={40}
                  height={40}
                  className="rounded"
                  priority
                />
              </m.div>
              <span className="hidden font-minecraft text-xl text-transparent bg-linear-to-r from-emerald-300 to-emerald-500 bg-clip-text transition-all group-hover:from-emerald-400 group-hover:to-emerald-500 sm:inline">
                Minepanel
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <GitHubStarButton label={t('github')} />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="mb-8 space-y-4 text-center">
              <m.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-minecraft text-5xl font-bold text-white"
                style={{
                  textShadow: '0 0 20px rgba(157, 255, 63, 0.5), 0 0 40px rgba(157, 255, 63, 0.3)',
                }}
              >
                {t('welcome')}
              </m.h1>
              <m.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-gray-200"
              >
                {view === 'setup' ? t('setupWelcomeDescription') : view === 'invite' ? t('acceptInvitationDesc') : t('welcomeDescription')}
              </m.p>
            </div>

            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative"
            >
              <div className="absolute -inset-1 animate-pulse bg-linear-to-r from-emerald-600 via-green-500 to-emerald-600 opacity-30 blur-lg" />

              <div className="mc-panel relative backdrop-blur-md">
                <form onSubmit={handleSubmit}>
                  <CardHeader className="space-y-1 pb-4 pt-6">
                    <CardTitle className="flex items-center gap-2 font-minecraft text-2xl text-white">
                      {getCardTitle()}
                      <m.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-2 w-2 rounded-full bg-emerald-500"
                      />
                    </CardTitle>
                    <CardDescription className="text-gray-300">{getCardDescription()}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {view === 'login' && (
                        <>
                          {!passwordLoginDisabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="identifier" className="font-medium text-gray-200">
                                  {t('usernameOrEmail')}
                                </Label>
                                <Input
                                  id="identifier"
                                  value={identifier}
                                  onChange={(e) => setIdentifier(e.target.value)}
                                  placeholder={t('usernameOrEmail')}
                                  required
                                  autoComplete="username"
                                  className="mc-input h-10 text-gray-100"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="password" className="font-medium text-gray-200">
                                  {t('password')}
                                </Label>
                                <Input
                                  id="password"
                                  type="password"
                                  placeholder="********"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  required
                                  autoComplete="current-password"
                                  className="mc-input h-10 text-gray-100"
                                />
                              </div>

                              {setupStatus && !setupStatus.passwordRecoveryEnabled && (
                                <p className="text-xs text-amber-300">{t('passwordRecoveryUnavailable')}</p>
                              )}
                            </>
                          )}

                          {passwordLoginDisabled && (
                            <p className="text-sm text-gray-300">{t('ssoOnlyHint')}</p>
                          )}
                        </>
                      )}

                      {view === 'setup' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="username" className="font-medium text-gray-200">
                              {t('username')}
                            </Label>
                            <Input
                              id="username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder={t('username')}
                              required
                              autoComplete="username"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="font-medium text-gray-200">
                              {t('email')}
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              required
                              autoComplete="email"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="setup-password" className="font-medium text-gray-200">
                              {t('password')}
                            </Label>
                            <Input
                              id="setup-password"
                              type="password"
                              placeholder="********"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="font-medium text-gray-200">
                              {t('confirmPassword')}
                            </Label>
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="********"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>
                        </>
                      )}

                      {view === 'forgot' && (
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email" className="font-medium text-gray-200">
                            {t('email')}
                          </Label>
                          <Input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            required
                            autoComplete="email"
                            className="mc-input h-10 text-gray-100"
                          />
                        </div>
                      )}

                      {view === 'reset' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="reset-password" className="font-medium text-gray-200">
                              {t('newPassword')}
                            </Label>
                            <Input
                              id="reset-password"
                              type="password"
                              placeholder="********"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reset-confirm-password" className="font-medium text-gray-200">
                              {t('confirmPassword')}
                            </Label>
                            <Input
                              id="reset-confirm-password"
                              type="password"
                              placeholder="********"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>
                        </>
                      )}

                      {view === 'invite' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="invite-username" className="font-medium text-gray-200">
                              {t('username')}
                            </Label>
                            <Input
                              id="invite-username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder={t('username')}
                              required
                              autoComplete="username"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-email" className="font-medium text-gray-200">
                              {t('email')}
                            </Label>
                            <Input
                              id="invite-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              required={!invitation?.email}
                              disabled={!!invitation?.email}
                              autoComplete="email"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-password" className="font-medium text-gray-200">
                              {t('password')}
                            </Label>
                            <Input
                              id="invite-password"
                              type="password"
                              placeholder="********"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-confirm-password" className="font-medium text-gray-200">
                              {t('confirmPassword')}
                            </Label>
                            <Input
                              id="invite-confirm-password"
                              type="password"
                              placeholder="********"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              autoComplete="new-password"
                              className="mc-input h-10 text-gray-100"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex-col space-y-3 pb-4 pt-2">
                    {!(view === 'login' && passwordLoginDisabled) && (
                      <button
                        type="submit"
                        className="mc-btn mc-btn-emerald w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitDisabled}
                      >
                        {getSubmitLabel()}
                      </button>
                    )}

                    {view === 'login' && ssoEnabled && (
                      <button
                        type="button"
                        onClick={() => startSsoLogin(sso!.loginUrl)}
                        className="mc-btn mc-btn-lapis w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!serverAvailable}
                      >
                        {t('loginWithSso').replace('{provider}', sso!.providerName)}
                      </button>
                    )}

                    {view === 'login' && !passwordLoginDisabled && setupStatus?.passwordRecoveryEnabled && (
                      <button
                        type="button"
                        onClick={() => changeView('forgot')}
                        className="text-center text-xs text-gray-400 transition-colors hover:text-emerald-400"
                      >
                        {t('forgotPassword')}
                      </button>
                    )}

                    {(view === 'forgot' || view === 'reset' || view === 'invite') && (
                      <button
                        type="button"
                        onClick={() => {
                          router.replace('/');
                          changeView('login');
                        }}
                        className="text-center text-xs text-gray-400 transition-colors hover:text-emerald-400"
                      >
                        {t('backToLogin')}
                      </button>
                    )}
                  </CardFooter>
                </form>
              </div>
            </m.div>

            <div className="mt-10 flex items-center justify-center space-x-6">
              <m.div
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -10, 0] }}
                transition={{ y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 } }}
              >
                <Image src="/images/grass.webp" alt="Grass Block" width={48} height={48} className="drop-shadow-lg" />
              </m.div>
              <m.div
                whileHover={{ scale: 1.2, rotate: -10 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -12, 0] }}
                transition={{ y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 } }}
              >
                <Image src="/images/diamond.webp" alt="Diamond" width={48} height={48} className="drop-shadow-lg" />
              </m.div>
              <m.div
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                animate={{ y: [0, -8, 0] }}
                transition={{ y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
              >
                <Image src="/images/creeper.webp" alt="Creeper" width={24} height={48} className="drop-shadow-lg" />
              </m.div>
            </div>
          </m.div>
        </main>

        <footer className="relative z-10 bg-[var(--mc-stone)]/95 py-4 backdrop-blur-md" style={{ borderTop: "3px solid var(--mc-frame)" }}>
          <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
            <p className="text-sm text-gray-300">
              &copy; {new Date().getFullYear()} Minepanel. {t('allRightsReserved')}
            </p>
            <div className="flex space-x-4 text-gray-300">
              <Link href={LINK} className="transition-all hover:scale-105 hover:text-emerald-400">
                {t('help')}
              </Link>
              <Link href={LINK_DOCUMENTATION} className="transition-all hover:scale-105 hover:text-emerald-400">
                {t('documentation')}
              </Link>
              <Link href={LINK_GITHUB} className="transition-all hover:scale-105 hover:text-emerald-400">
                {t('github')}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
