import { FC } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ComposeSnippet, ComposeSnippetTarget } from '@/lib/types/types';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface ComposeSnippetsFieldProps {
  snippets: ComposeSnippet[];
  onChange: (snippets: ComposeSnippet[]) => void;
}

const TARGET_LABELS: Record<ComposeSnippetTarget, 'composeSnippetTargetRoot' | 'composeSnippetTargetServices' | 'composeSnippetTargetMc'> = {
  root: 'composeSnippetTargetRoot',
  services: 'composeSnippetTargetServices',
  mc: 'composeSnippetTargetMc',
};

const PLACEHOLDERS: Record<ComposeSnippetTarget, string> = {
  root: 'networks:\n  my-network:\n    external: true',
  services: 'sidecar:\n  image: busybox\n  command: sleep infinity',
  mc: 'networks:\n  my-network: {}\ndns:\n  - 1.1.1.1',
};

export const ComposeSnippetsField: FC<ComposeSnippetsFieldProps> = ({ snippets, onChange }) => {
  const { t } = useLanguage();

  const update = (index: number, patch: Partial<ComposeSnippet>) =>
    onChange(snippets.map((snippet, i) => (i === index ? { ...snippet, ...patch } : snippet)));

  return (
    <div className="space-y-3 p-4 rounded-md bg-gray-800/50 border border-gray-700/50">
      <div>
        <Label className="text-gray-200 font-minecraft text-sm">{t('composeSnippets')}</Label>
        <p className="text-xs text-gray-400 mt-1">{t('composeSnippetsDesc')}</p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{t('composeSnippetsWarning')}</p>
      </div>

      {snippets.map((snippet, index) => (
        <div key={index} className="space-y-2 rounded-md border border-gray-700/50 bg-gray-900/40 p-3">
          <div className="flex items-center gap-2">
            <Select value={snippet.target} onValueChange={(target) => update(index, { target: target as ComposeSnippetTarget })}>
              <SelectTrigger
                aria-label={t('composeSnippets')}
                className="bg-gray-800/70 text-gray-200 border-gray-700/50 focus:ring-emerald-500/30"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                {(Object.keys(TARGET_LABELS) as ComposeSnippetTarget[]).map((target) => (
                  <SelectItem key={target} value={target}>
                    {t(TARGET_LABELS[target])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('removeComposeSnippet')}
              className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-400 hover:bg-gray-700/50"
              onClick={() => onChange(snippets.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={snippet.yaml}
            onChange={(e) => update(index, { yaml: e.target.value })}
            placeholder={PLACEHOLDERS[snippet.target]}
            spellCheck={false}
            className="min-h-24 bg-gray-800/70 text-gray-200 border-gray-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/30 font-mono text-sm"
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-gray-700/50 bg-gray-800/70 text-gray-200 hover:bg-gray-700/50"
        onClick={() => onChange([...snippets, { target: 'mc', yaml: '' }])}
      >
        <Plus className="h-4 w-4 mr-1" />
        {t('addComposeSnippet')}
      </Button>
      <p className="text-xs text-gray-400">{t('composeSnippetsHelp')}</p>
    </div>
  );
};
