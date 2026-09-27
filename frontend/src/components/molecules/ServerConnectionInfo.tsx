'use client';

import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Copy, Check, Globe, Wifi, Loader2, Network } from 'lucide-react';
import { mcToast } from '@/lib/utils/minecraft-toast';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { getAllIPs, getProxyStatus, getServerProxyHostname } from '@/services/network.service';
import { LINK_LEARN_HOW_LAN } from '@/lib/providers/constants';
import { ServerEdition } from '@/lib/types/types';

interface ServerConnectionInfoProps {
  readonly port: string;
  readonly serverId: string;
  readonly edition?: ServerEdition;
}

export function ServerConnectionInfo({ port, serverId, edition }: ServerConnectionInfoProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);
  const [publicIP, setPublicIP] = useState<string | null>(null);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyHostname, setProxyHostname] = useState<string | null>(null);

  // Proxy only works with Java edition
  const supportsProxy = edition !== 'BEDROCK';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ipData, proxyStatus] = await Promise.all([getAllIPs(), getProxyStatus()]);

        setPublicIP(ipData.publicIP);
        setLocalIPs(ipData.localIPs);

        // Check if proxy is enabled and get server hostname (Java only)
        if (supportsProxy && proxyStatus.enabled && proxyStatus.baseDomain) {
          setProxyEnabled(true);
          const hostname = await getServerProxyHostname(serverId);
          setProxyHostname(hostname);
        }
      } catch (error) {
        console.error('Error fetching connection info:', error);
        mcToast.error(t('error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [serverId, t, supportsProxy]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((current) => (current === text ? null : current)), 2000);
      mcToast.success(t('copiedToClipboard'));
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      mcToast.error(t('copyError'));
    }
  };

  const displayPublicIP = publicIP || (localIPs.length > 0 ? localIPs[0] : 'localhost');
  const globalAddress = `${displayPublicIP}:${port}`;
  const lanAddress = localIPs.length > 0 ? `${localIPs[0]}:${port}` : null;

  // One copyable address; the label lives in the icon's tooltip to keep the header one line.
  const address = (Icon: LucideIcon, label: string, value: string, color: string) => (
    <span key={value} className="inline-flex items-center gap-1.5 min-w-0" title={label}>
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-label={label} />
      <span className="font-mono text-sm text-gray-100 select-all truncate">{value}</span>
      <button type="button" onClick={() => copyToClipboard(value)} className="mc-iconbtn size-6 shrink-0" aria-label={`${t('quickCopy')}: ${label}`}>
        {copied === value ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );

  if (isLoading) {
    return <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" aria-label={t('serverConnection')} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {proxyEnabled && proxyHostname ? (
        address(Network, t('proxyHostname') || 'Proxy Hostname', proxyHostname, '#22d3ee')
      ) : (
        <>
          {address(Globe, t('globalIP'), globalAddress, 'var(--mc-emerald)')}
          {lanAddress && lanAddress !== globalAddress
            ? address(Wifi, t('lanIP'), lanAddress, '#60a5fa')
            : (
                <a href={LINK_LEARN_HOW_LAN} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-emerald-300 underline">
                  {t('playingLAN')} {t('learnHow')}
                </a>
              )}
        </>
      )}
    </div>
  );
}
