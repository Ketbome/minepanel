import { FC, useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/hooks/useLanguage";
import { executeServerCommand, getGamerules } from "@/services/docker/fetchs";
import { mcToast } from "@/lib/utils/minecraft-toast";

interface GamerulesEditorProps {
  serverId: string;
  rconPort: string;
  rconPassword: string;
}

const isBoolean = (value: string) => value === "true" || value === "false";

export const GamerulesEditor: FC<GamerulesEditorProps> = ({ serverId, rconPort, rconPassword }) => {
  const { t } = useLanguage();
  const [rules, setRules] = useState<{ name: string; value: string }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGamerules(serverId);
      setSupported(result.supported);
      setRules(result.rules);
      setDrafts({});
    } catch (error) {
      console.error("Error fetching gamerules:", error);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    load();
  }, [load]);

  const setRule = async (name: string, value: string) => {
    const result = await executeServerCommand(serverId, { command: `gamerule ${name} ${value}`, rconPort, rconPassword });
    if (!result.success) {
      mcToast.error(result.output);
      return;
    }
    mcToast.success(t("gameruleChanged"));
    setRules((current) => current.map((rule) => (rule.name === name ? { ...rule, value } : rule)));
    setDrafts(({ [name]: _, ...rest }) => rest);
  };

  if (!supported) return null;

  const visible = rules.filter((rule) => rule.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <span className="font-minecraft text-sm text-gray-200">{t("allGamerules")}</span>
        <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading} className="ml-auto h-7 text-gray-400 hover:text-white">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("searchGamerules")} className="h-8 mb-3 text-sm bg-gray-900/60 border-gray-700/50 text-gray-200" />
      {rules.length === 0 ? (
        <p className="text-xs text-gray-400">{loading ? t("loading") : t("gamerulesUnavailable")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-96 overflow-y-auto pr-1">
          {visible.map(({ name, value }) => (
            <div key={name} className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-mono text-gray-300 truncate" title={name}>
                {name}
              </span>
              {isBoolean(value) ? (
                <Switch checked={value === "true"} onCheckedChange={(checked) => setRule(name, String(checked))} aria-label={name} />
              ) : (
                <Input
                  type="number"
                  value={drafts[name] ?? value}
                  onChange={(e) => setDrafts((current) => ({ ...current, [name]: e.target.value }))}
                  onBlur={() => drafts[name] !== undefined && drafts[name] !== value && /^-?\d+$/.test(drafts[name]) && setRule(name, drafts[name])}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  aria-label={name}
                  className="w-24 h-7 text-xs bg-gray-900/60 border-gray-700/50 text-gray-200"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
