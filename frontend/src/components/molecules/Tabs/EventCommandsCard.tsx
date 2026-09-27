import { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { ServerConfig } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';
import type { TranslationKey } from '@/lib/translations';

type EventField = 'rconCmdsStartup' | 'rconCmdsFirstConnect' | 'rconCmdsOnConnect' | 'rconCmdsOnDisconnect' | 'rconCmdsLastDisconnect';

const EVENTS: { field: EventField; label: TranslationKey; hint: TranslationKey; placeholder: string }[] = [
  { field: 'rconCmdsStartup', label: 'eventCmdsStartup', hint: 'eventCmdsStartupHint', placeholder: 'gamerule keep_inventory true' },
  { field: 'rconCmdsFirstConnect', label: 'eventCmdsFirstConnect', hint: 'eventCmdsFirstConnectHint', placeholder: 'time set day' },
  { field: 'rconCmdsOnConnect', label: 'eventCmdsOnConnect', hint: 'eventCmdsOnConnectHint', placeholder: 'tellraw @a {"text":"Welcome!"}' },
  { field: 'rconCmdsOnDisconnect', label: 'eventCmdsOnDisconnect', hint: 'eventCmdsOnDisconnectHint', placeholder: 'save-all' },
  { field: 'rconCmdsLastDisconnect', label: 'eventCmdsLastDisconnect', hint: 'eventCmdsLastDisconnectHint', placeholder: 'kill @e[type=item]' },
];

// The itzg recipe for "run once per new player": players without a team are new, get the
// kit, then move to Old so they never get it again.
const STARTER_KIT = {
  rconCmdsStartup: 'team add New\nteam add Old',
  rconCmdsOnConnect: 'team join New @a[team=]\ngive @a[team=New] bread 16\ngive @a[team=New] stone_sword\nteam join Old @a[team=New]',
};

interface EventCommandsCardProps {
  config: ServerConfig;
  updateConfig: <K extends keyof ServerConfig>(field: K, value: ServerConfig[K]) => void;
}

export const EventCommandsCard: FC<EventCommandsCardProps> = ({ config, updateConfig }) => {
  const { t } = useLanguage();
  const rconOff = config.enableRcon === false;
  const canAddStarterKit = !config.rconCmdsStartup?.trim() && !config.rconCmdsOnConnect?.trim();

  return (
    <Card className="bg-gray-900/60 border-gray-700/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-emerald-400 font-minecraft flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('eventCmdsTitle')}
        </CardTitle>
        <CardDescription className="text-gray-300">{t('eventCmdsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rconOff && (
          <p className="flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {t('eventCmdsRconOff')}
          </p>
        )}
        <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
          <li>{t('eventCmdsNoteWho')}</li>
          <li>{t('eventCmdsNotePeriod')}</li>
          <li>{t('eventCmdsNoteRestart')}</li>
        </ul>

        {EVENTS.map(({ field, label, hint, placeholder }) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={field} className="text-gray-200 font-minecraft text-sm">
              {t(label)}
            </Label>
            <Textarea
              id={field}
              rows={2}
              value={config[field] ?? ''}
              onChange={(event) => updateConfig(field, event.target.value)}
              placeholder={placeholder}
              className="bg-gray-800/70 border-gray-700/50 font-mono text-sm placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">{t(hint)}</p>
          </div>
        ))}

        {canAddStarterKit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updateConfig('rconCmdsStartup', STARTER_KIT.rconCmdsStartup);
              updateConfig('rconCmdsOnConnect', STARTER_KIT.rconCmdsOnConnect);
            }}
            className="gap-2 border-gray-700/50 bg-gray-800/40 text-gray-200 hover:bg-emerald-600/20 hover:text-emerald-300"
          >
            <Sparkles className="h-4 w-4" />
            {t('eventCmdsStarterKit')}
          </Button>
        )}

        <p className="text-xs text-gray-500">{t('eventCmdsPermission')}</p>
      </CardContent>
    </Card>
  );
};
