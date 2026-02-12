
import { FC, useEffect, useState } from 'react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { SftpStatus, getSftpStatus, enableSftp, disableSftp } from '@/services/sftp/sftp.service';
import { Lock, Unlock, Copy, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mcToast } from '@/lib/utils/minecraft-toast';

interface SftpTabProps {
    serverId: string;
}

export const SftpTab: FC<SftpTabProps> = ({ serverId }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<SftpStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const data = await getSftpStatus(serverId);
            setStatus(data);
        } catch (error) {
            console.error('Failed to load SFTP status', error);
            // Typically silent fail or show generic error if completely broken
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [serverId]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission if inside a form
        if (!status) return;
        try {
            setProcessing(true);
            if (status.enabled) {
                await disableSftp(serverId);
                setStatus({ ...status, enabled: false });
                mcToast.success(t('sftpInactive'));
            } else {
                const newStatus = await enableSftp(serverId);
                setStatus(newStatus);
                mcToast.success(t('sftpActive'));
            }
        } catch (error) {
            mcToast.error('Failed to toggle SFTP');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        mcToast.success('Copied to clipboard');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!status) {
        return <div className="p-8 text-center text-red-400">Error loading SFTP status</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-xl font-minecraft text-white flex items-center gap-2">
                            {status.enabled ? <Unlock className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-gray-400" />}
                            {t('sftpStatus')}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                            {status.enabled ? t('sftpActive') : t('sftpInactive')}
                        </p>
                    </div>

                    <Button
                        onClick={handleToggle}
                        disabled={processing}
                        variant={status.enabled ? "destructive" : "default"}
                        className={status.enabled ? "" : "bg-emerald-600 hover:bg-emerald-700"}
                    >
                        {processing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                        {status.enabled ? t('disableSftp') : t('enableSftp')}
                    </Button>
                </div>

                {status.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 group hover:border-emerald-500/30 transition-colors">
                            <p className="text-gray-500 text-xs uppercase mb-1 font-semibold tracking-wider">{t('sftpHost')}</p>
                            <div className="flex items-center justify-between">
                                <code className="text-emerald-400 font-mono text-sm md:text-base">{status.host}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(status.host)}
                                    className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 group hover:border-emerald-500/30 transition-colors">
                            <p className="text-gray-500 text-xs uppercase mb-1 font-semibold tracking-wider">{t('sftpPort')}</p>
                            <div className="flex items-center justify-between">
                                <code className="text-emerald-400 font-mono text-sm md:text-base">{status.port}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(status.port.toString())}
                                    className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 group hover:border-emerald-500/30 transition-colors">
                            <p className="text-gray-500 text-xs uppercase mb-1 font-semibold tracking-wider">{t('sftpUsername')}</p>
                            <div className="flex items-center justify-between">
                                <code className="text-emerald-400 font-mono text-sm md:text-base">{status.username}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(status.username)}
                                    className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 group hover:border-emerald-500/30 transition-colors">
                            <p className="text-gray-500 text-xs uppercase mb-1 font-semibold tracking-wider">{t('sftpPassword')}</p>
                            <p className="text-gray-300 text-sm">{t('sftpPasswordDesc')}</p>
                        </div>
                    </div>
                )}

                {!status.enabled && (
                    <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-blue-200/80 text-sm leading-relaxed">
                            {t('sftpWarning')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
